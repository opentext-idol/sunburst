module.exports = (grunt) ->
  jasmineRequireTemplate = require 'grunt-template-jasmine-requirejs'

  jasmineSpecRunner = 'spec-runner.html'

  specs = 'target/test/spec/**/*.js'
  source = 'src/js/**/*.js'
  sourceBabel = 'target/src/**/*.js'

  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    clean: [
      'bin'
      'target'
      '.grunt'
      jasmineSpecRunner
    ]
    babel:
      options:
        plugins: ['transform-es2015-block-scoping']
      transform:
        files: [{
          expand: true
          src: ['src/**/*.js']
          dest: 'target'
          ext: '.js'
        }, {
          expand: true
          src: ['test/**/*.js']
          dest: 'target'
          ext: '.js'
        }]
    connect:
      server:
        options:
          port: 8000
          useAvailablePort: true
    jasmine:
      test:
        src: sourceBabel
        options:
          keepRunner: false
          outfile: jasmineSpecRunner
          specs: specs
          template: jasmineRequireTemplate
          templateOptions:
            requireConfigFile: 'test/require-config.js'
    jshint:
      all: [
        source
        specs
      ],
      options:
        asi: true
        bitwise: true
        browser: true
        camelcase: true
        curly: true
        devel: true
        eqeqeq: true
        es3: true
        expr: true
        forin: true
        freeze: true
        jquery: true
        latedef: true
        newcap: true
        noarg: true
        noempty: true
        nonbsp: true
        undef: true
        unused: true
        globals:
          define: false
          expect: false
          it: false
          require: false
          describe: false
          beforeEach: false
          afterEach: false
          jasmine: false
    watch:
      buildTest:
        files: [specs, source]
        tasks: ['jasmine:test:build']
      test:
        files: [specs, source]
        tasks: ['jasmine:test']


  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jasmine'
  grunt.loadNpmTasks 'grunt-babel'

  grunt.registerTask 'lint', ['jshint']
  grunt.registerTask 'test', ['babel:transform', 'jasmine:test']
  grunt.registerTask 'watch-test', ['jasmine:test', 'watch:test']
  grunt.registerTask 'browser-test', ['jasmine:test:build', 'connect:server', 'watch:buildTest']
