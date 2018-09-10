export default class HelloWebWorker {
  constructor(dependencies, factory) {
    let _URL = self.URL || self.webkitURL
    let contents = makecontents(dependencies, factory)
    let blob = new Blob([ contents ], { type: 'application/javascript' })
    let blobURL = _URL.createObjectURL(blob)
    let worker = new Worker(blobURL)

    this.worker = worker
    this.URL = _URL
    this.blobURL = blobURL
  }
  watch(callback) {
    this.worker.postMessage()
    this.worker.onmessage = e => {
      callback.call(this, e.data)
    }
    this.worker.onerror = e => {
      throw e
    }
  }
  invoke(...args) {
    return new Promise((resolve, reject) => {
      this.worker.postMessage(args)
      this.worker.onmessage = e => {
        resolve(e.data)
      }
      this.worker.onerror = e => {
        reject(e)
      }
    })
  }
  close() {
    this.URL.revokeObjectURL(this.blobURL)
    this.worker.terminate()
    this.worker = null
    this.URL = null
    this.blobURL = null
  }
  static run(factory, ...args) {
    let worker = new HelloWorker(factory)
    return worker.invoke(...args).then((res) => { 
      worker.close()
      return res 
    }).catch((e) => {
      worker.close()
      throw e
    })
  }
}

function makecontents(dependencies, factory) {
  // only one perameter passed, use it as factory
  if (factory === undefined) {
    factory = dependencies
    dependencies = null
  }

  let fn = factory ? (factory + '').trim() : 'function() {}'
  let scripts = ''

  // make window works in worker
  scripts += 'var window = self;\n'
  
  // import dependencies
  if (Array.isArray(dependencies)) {
    let deps = dependencies.filter(dep => typeof dep === 'string')
    let depsStr = deps.join(`','`)
    scripts += `importScripts('${depsStr}');\n`
  }
  else if (typeof dependencies === 'string') {
    scripts += `${dependencies};\n`
  }

  // worker message logic
  scripts += `
    var $notify = function(data) {
      self.postMessage(data);
    };
    var $throw = function(e) {
      throw e;
    };
  
    var fn = ${fn}; // be able to use $throw and $notify
    var postback = function(res) {
      // if developer use $notify or $throw in factory
      var funstr = fn + '';
      if (funstr.indexOf('$notify') > -1) {
        // do nothing...
      }
      // if res is a promise-like object
      else if (typeof res === 'object' && typeof res.then === 'function' && typeof res.catch === 'function') {
        res.then(function(data) {
          $notify(data);
        })
        .catch(function(e) {
          $throw(e);
        });
      }
      // normal return value
      else {
        $notify(res);
      }
    };

    self.onmessage = function(e) {
      var data = e.data;
      var res = fn.apply(null, data);
      postback(res);
    };
  `
  return scripts.trim()
}
