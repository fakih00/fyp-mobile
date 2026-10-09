<?php
require_once __DIR__ . '/../backend/controllers/ExerciseAIController.php';

class UploadCheckResponse extends RuntimeException {
    public $payload;
    public $status;

    public function __construct($payload, $status) {
        parent::__construct($payload['message'] ?? '');
        $this->payload = $payload;
        $this->status = $status;
    }
}

class UploadCheckController extends ExerciseAIController {
    public function __construct() {}
    protected function requireAuth() { return 1; }
    protected function jsonResponse($data, $status = 200) {
        throw new UploadCheckResponse($data, $status);
    }
}

$cases = [
    [UPLOAD_ERR_INI_SIZE, 413, 'server upload limit'],
    [UPLOAD_ERR_FORM_SIZE, 413, 'server upload limit'],
    [UPLOAD_ERR_PARTIAL, 400, 'interrupted'],
    [UPLOAD_ERR_NO_FILE, 400, 'No video'],
    [UPLOAD_ERR_NO_TMP_DIR, 500, 'folder'],
    [UPLOAD_ERR_CANT_WRITE, 500, 'write'],
    [UPLOAD_ERR_EXTENSION, 500, 'rejected'],
];

foreach ($cases as [$error, $status, $message]) {
    $_FILES = ['video' => ['error' => $error, 'tmp_name' => '']];
    try {
        (new UploadCheckController())->analyzeVideo();
        throw new RuntimeException('Expected an upload error response.');
    } catch (UploadCheckResponse $response) {
        if ($response->status !== $status || strpos($response->getMessage(), $message) === false) {
            throw new RuntimeException('Incorrect response for upload error ' . $error);
        }
    }
}

$_FILES = [];
$_SERVER['CONTENT_LENGTH'] = 0;
try {
    (new UploadCheckController())->analyzeVideo();
    throw new RuntimeException('Expected a missing video response.');
} catch (UploadCheckResponse $response) {
    if ($response->status !== 400) throw new RuntimeException('Missing video should return 400.');
}

echo "PASS: upload-limit, interrupted, missing-file, server-storage and missing-video responses.\n";
