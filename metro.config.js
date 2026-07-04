const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('bin');
config.resolver.sourceExts.push('js', 'json', 'ts', 'tsx', 'cjs');
module.exports = config;
