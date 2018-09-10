var gulp = require('gulp')
var bufferify = require('gulp-bufferify')
var babel = require('gulp-babel')

var entryfile = 'src/hello-webworker.js'

var babelconfig = {
  presets: ['env'],
}

gulp.src(entryfile)
  .pipe(babel(babelconfig))
  .pipe(bufferify(function(content) {

    content = content.toString()
    content = content.replace(/self\.URL/g, 'root.URL')
    content = content.replace(/self\.webkitURL/g, 'root.webkitURL')
    content = content.replace(/Object\.defineProperty\(exports,[\s\S]+?\);/gm, '')
    content = content.replace(`exports.default = HelloWebWorker;`, '')
    content = `
;(function(root) {

${content}

if (typeof define === 'function' && (define.cmd || define.amd)) { // amd | cmd
  define(function(require, exports, module) {
    module.exports = HelloWebWorker;
  });
}
else if (typeof module !== 'undefined' && module.exports) {
  module.exports = HelloWebWorker;
}
else {
  root['hello-webworker'] = HelloWebWorker;
}

})(typeof self === 'object' ? self : typeof global === 'object' ? global : this);
    `
    content = content.trim()
    content += "\n"

    return content
  }))
  .pipe(gulp.dest('dist'))