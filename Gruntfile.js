module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
          '* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
          'Authored by Marcin Krawiec */\n',


    uglify: {
      devel: {
        options: {
          banner: '<%= banner %>',
          compress: {
            drop_console: true,
          },
          mangle: {
            except: ['jQuery','Modernizr']
          },
          sourceMap: true
        },
        files: {
          'carousel.min.js': [
            'carousel.js',
          ]
        }
      }
    },


    sass: {
      options: {
        precision: 10
      },
      dist: {
        options: {
          precision: 10
        },
        files: {
          "example.css": "example.scss"
        }
      },
    },


    wiredep: {
      task: {
        src: [
          'example.html'
        ]
      }
    }

  });


  grunt.registerTask('default',['build']);
  grunt.registerTask('build',['wiredep','uglify','sass']);

};