const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadSource(relativePath, bindings) {
    const filename = path.resolve(__dirname, '..', relativePath);
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
        filename,
        babelrc: false,
        configFile: false,
        presets: ['babel-preset-expo'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const module = { exports: {} };
    vm.runInNewContext(code, {
        module, exports: module.exports, Blob, File, TextEncoder, Uint8Array,
        AbortController, setTimeout, clearTimeout, console, ...bindings,
        require: name => name.startsWith('@babel/runtime/') ? require(name) : bindings.require(name),
    }, { filename });
    return module.exports;
}

// Expo's patched FormData retains file objects for its multipart converter.
class MultipartForm {
    constructor() { this.parts = []; }
    append(name, value) { this.parts.push([name, value]); }
    entries() { return this.parts.values(); }
}

class NativeFile {
    constructor(uri) {
        this.uri = uri;
        this.name = uri.split('/').pop();
        this.type = 'video/mp4';
    }
    async bytes() { return new Uint8Array([65, 66, 67]); }
}

async function main() {
    const { convertFormDataAsync } = loadSource('node_modules/expo/src/winter/fetch/convertFormData.ts', {
        require: () => ({ blobToArrayBufferAsync: blob => blob.arrayBuffer() }),
    });
    const oldForm = new MultipartForm();
    oldForm.append('video', { uri: 'file:///clip.mp4', name: 'clip.mp4', type: 'video/mp4' });
    await assert.rejects(convertFormDataAsync(oldForm), /Unsupported FormDataPart implementation/);

    for (const platform of ['android', 'ios', 'web']) {
        let requested = false;
        const apiModule = loadSource('src/services/api.js', {
            FormData: MultipartForm,
            require(name) {
                if (name === 'react-native') return { Platform: { OS: platform } };
                if (name === 'expo-file-system') return { File: NativeFile };
                throw new Error(`Unexpected import: ${name}`);
            },
            async fetch(url, options) {
                requested = true;
                assert.ok(url.endsWith('/analyzeExerciseVideo'));
                assert.equal(options.headers.Authorization, 'Bearer regression-token');
                assert.equal(options.headers['Content-Type'], undefined);
                const { body } = await convertFormDataAsync(options.body, 'test-boundary');
                const encoded = new TextDecoder().decode(body);
                assert.ok(encoded.includes('filename="clip.mp4"'));
                assert.ok(encoded.includes('video/mp4'));
                assert.ok(encoded.includes('ABC'));
                assert.ok(encoded.includes('Barbell Squat'));
                assert.ok(encoded.includes('10'));
                return { status: 200, text: async () => '{"success":true,"reps":10}' };
            },
        });
        apiModule.setApiToken('regression-token');
        const video = platform === 'web'
            ? { uri: 'blob:clip', file: new File(['ABC'], 'clip.mp4', { type: 'video/mp4' }) }
            : 'file:///clip.mp4';
        const result = await apiModule.api.uploadExerciseVideo(video, 'Barbell Squat', 10);
        assert.ok(requested);
        assert.equal(result.status, 200);
        assert.equal(result.data.reps, 10);
        console.log(`PASS: ${platform} upload encodes through Expo multipart converter`);
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
