/*eslint-env node*/
module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            options: {
                force: true
            },
            vendor: '../src/plugin/iframe_root/modules/vendor/*',
            bower: './bower_components/',
            npm: './node_modules/'
        },
        copy: {
            preact: {
                expand: true,
                flatten: true,
                src: 'node_modules/preact/dist/preact.umd.js',
                dest: '../src/plugin/iframe_root/modules/vendor/preact'
            },
            htm: {
                expand: true,
                flatten: true,
                src: 'node_modules/htm/dist/htm.umd.js',
                dest: '../src/plugin/iframe_root/modules/vendor/htm'
            },
            dompurify: {
                expand: true,
                flatten: true,
                src: 'node_modules/dompurify/dist/purify.js',
                dest: '../src/plugin/iframe_root/modules/vendor/dompurify'
            },
            'pure-uuid': {
                expand: true,
                flatten: true,
                src: 'node_modules/pure-uuid/uuid.js',
                dest: '../src/plugin/iframe_root/modules/vendor/pure-uuid'
            },
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
};