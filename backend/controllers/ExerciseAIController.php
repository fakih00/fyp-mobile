<?php
require_once __DIR__ . '/BaseController.php';

class ExerciseAIController extends BaseController {
    public function analyzeVideo() {
        @set_time_limit(300);
        @ini_set('max_execution_time', '300');

        $userId = $this->requireAuth();

        if (empty($_FILES['video']) || !is_uploaded_file($_FILES['video']['tmp_name'])) {
            $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
            $serverLimitBytes = $this->parsePhpSize(ini_get('post_max_size'));
            if ($contentLength > 0 && $serverLimitBytes > 0 && $contentLength > $serverLimitBytes) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video is too large for the backend upload limit. Stop a little earlier and retry.',
                    'details' => 'The PHP post_max_size limit was exceeded before the video reached the AI analyzer.',
                    'upload_limit_mb' => round($serverLimitBytes / 1024 / 1024, 1),
                    'received_mb' => round($contentLength / 1024 / 1024, 1),
                ], 413);
            }
            $this->errorResponse('Exercise video is required.', 400);
        }

        $exerciseName = trim($_POST['exercise_name'] ?? 'general');
        $targetReps = (int)($_POST['target_reps'] ?? 0);
        $file = $_FILES['video'];

        if (!empty($file['error'])) {
            $this->errorResponse('Video upload failed.', 400);
        }

        $maxBytes = 38 * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxBytes) {
            $this->errorResponse('Video is too large. Keep recordings under 38 MB.', 413);
        }

        $uploadDir = __DIR__ . '/../uploads/exercise_ai';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
            $this->errorResponse('Could not prepare upload folder.', 500);
        }

        $extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        if (!in_array($extension, ['mp4', 'mov', 'm4v', '3gp'], true)) {
            $extension = 'mp4';
        }

        $safeName = 'poseform_' . $userId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            $this->errorResponse('Could not save uploaded video.', 500);
        }

        $script = realpath(__DIR__ . '/../../ml/exercise_ai/video_pose_analyzer.py');
        if (!$script) {
            @unlink($targetPath);
            $this->errorResponse('Exercise AI analyzer script was not found.', 500);
        }

        $python = getenv('PYTHON_BIN') ?: 'python';
        $command = escapeshellarg($python)
            . ' ' . escapeshellarg($script)
            . ' --video ' . escapeshellarg($targetPath)
            . ' --exercise ' . escapeshellarg($exerciseName)
            . ' --target-reps ' . escapeshellarg((string)$targetReps);

        $output = [];
        $exitCode = 0;
        exec($command . ' 2>&1', $output, $exitCode);
        $raw = trim(implode("\n", $output));
        $payload = null;
        foreach ($output as $line) {
            $line = trim($line);
            if ($line !== '' && str_starts_with($line, '{')) {
                $payload = json_decode($line, true);
                if (is_array($payload)) {
                    break;
                }
            }
        }

        if (!is_array($payload)) {
            @unlink($targetPath);
            $this->jsonResponse([
                'success' => false,
                'message' => 'Exercise AI analyzer did not return valid JSON.',
                'exit_code' => $exitCode,
                'raw_output' => $raw,
            ], 500);
        }

        @unlink($targetPath);
        $payload['video_file'] = null;
        $payload['video_retained'] = false;
        $payload['analyzed_at'] = date('c');
        $payload['user_id'] = $userId;

        $this->jsonResponse($payload, 200);
    }

    private function parsePhpSize($value) {
        $value = trim((string)$value);
        if ($value === '') return 0;
        $unit = strtolower(substr($value, -1));
        $number = (float)$value;
        if ($unit === 'g') return (int)($number * 1024 * 1024 * 1024);
        if ($unit === 'm') return (int)($number * 1024 * 1024);
        if ($unit === 'k') return (int)($number * 1024);
        return (int)$number;
    }
}
