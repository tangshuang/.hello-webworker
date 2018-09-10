# Hello WebWorker

A library for quickly using web worker in browser. 
It is not designed for node side, just for browser side.

## Install

```
npm install hello-webworker
```

or

```
<script src="dist/hello-webworker.js"></script>
```

## Usage

ES6: 

```js
import HelloWebWorker from 'hello-webworker/src/hello-webworker'
```

With pack tools like webpack:

```js
import HelloWebWorker from 'hello-webworker'
```

CommonJS:

```js
const HelloWebWorker = require('hello-webworker')
```

AMD & CMD:

```js
define(['hello-webworker'], function(HelloWebWorker) {
  // use HelloWebWorker
})
```

Normal Browsers:

```js
const HelloWebWorker = window['hello-webworker']
```

To use:

```js
const computer = new HelloWebWorker(`
  function(arg1, arg2) {
    // compute
    return result
  }
`)
// ...
computer.invoke(data1, data2).then(res => {}).catch(e => {})
// ...
computer.invoke(data3, data4).then(res => {}).catch(e => {})
```

The core idea is use `new` to create a computer with passed function. And then use this computer to calculate with different parameters.

## Methods

### constructor([dependencies,] factory)

When you `new` an instance, you should pass a function as a string into constructor. 
This function can be called 'algorithm', later you will use it to calculate different variables to get results.

In worker, you can not use global `window` default. But here in HelloWoker factory, you can use `window` as global `self`.

_dependencies_

`dependencies` is optional.

Script files which to be import into worker script.
In webworker, we use `importScripts` to import script files.
You should pass script files url array as dependencies:

```js
const computer = new HelloWebWorker(['/hello-type/dist/hello-type.js'], `function(num) {
  const { Type, HelloType } = window['hello-type']
  const NumberType = new Type(Number)
  HelloType.expect(num).toMatch(NumberType)

  return num + 1
}`)
```

Here, I import hello-type by import url '/hello-type/dist/hello-type.js', and in the function, than you can use HelloType.

```js
const computer = new HelloWebWorker(
  `
  var a = 150
  var b = 110
  `,
  `
  function(x, y) {
    return x + y + a + b // here I can use a and b, because a and b is loaded before function
  }
  `
)
```

### invoke(...args)

Invoke the 'algorithm' function and pass parameters into it.
`invoke` method return a promise, so you can use `then` or use in `async function`.

```js
async function() {
  let res = await computer.invoke(data)
  // ...
} ()
```

### close()

Destory the computer. After close, invoke will throw error.

### watch(callback)

Different from `invoke`, in `invoke` .then only run once when the worker thread call back, in `watch` the `callback` function will run at each time the worker thread call back, so you can use regular loop in worker script.

```js
let factory = `function() {
  setInterval(() => fetch('http_url').then($notify), 10*60*1000)
}`
let listener = new HelloWebWorker(factory)
listener.watch(function(data) {
  console.log(data)
})
```

Then you will find callback function passed into `watch` will be run at each time when `$notify` called.

NOTICE: When you use watch, the factory function is called 'watcher', you should NOT pass parameters into it and should NOT invoke `invoke` anymore. In fact, you should make sure that the script function should be run in worker only once. So how to pass args? Just use it you your script string:

```js
let factory = `function() {
  let a = ${a}; // use 'a' here
  let time = ${Date.now()}; // pass time
}`
```

Remember to use `.close()` to release it when your component will unmount.

### static run(factory, ...args)

To run a function in a worker only once, you can use this static method:

```js
let factory = `
  function(arg1, arg2) {
    // ...
  }
`
HelloWebWorker.run(factory, data1, data2).then(res => {
  // ...
})
```

You do not need to close the worker by yourself, `run` method will close the worker when resolved.

### $notify && $throw

I provide `$notify` and `$throw` functions in your 'algorithm' function, so that you can post data back to main thread anytime.
`$notify` means send back successful data, `$throw` means throw out error.

```js
let factory = `function() {
  //..
  if (wrong) {
    $throw(err) // break program here
  }
  $notify(1)
  return 2 // will not work because of $notify
}`
```

If you use `$notify`, return value in factory will be ignored. `$notify` has higher priority.
If you use multiple `$notify`, only the first one will work when you use `invoke`, you can only receive the first notify message in your main thread, however, `watch` method works as you wanted.

Use `$notify` in situations which has async operations.

```js
let factory = `function(url) {
  fetch(url).then(res => {
    $notify(res.json())
  })
}`
```

## Others

After you create a worker thread, the function will not run until you call `invoke`. 
So do not invoke a worker thread factory which has `setInterval` too many times unless you know what you are doing.

When you post back data from worker thread to main thread, you'd better to remember that never send back with context. i.e.

```js
// in worker factory
var e = new Obj(msg)
$notify(e) // this is wrong
```

The previous code will throw an error because memory is not shared between different threads.

I use blob to inject js, which make hello-webworker not work in IE10. 
I use native Promise, so Promise polyfill needed.

If you want some referer, you can look into https://github.com/zhangyuanwei/EasyWorker which has more feature and supports node side.
