'use strict';

var Transform = require('stream').Transform;
var request = require('request');
var fs = require('fs');

/**
 * Collect
 */
function Collect() {
    if( !(this instanceof Collect)) {
        return new Collect;
    }
    this._middleware = [];
    this._data = [];
    Transform.call(this);
}

/**
 * 继承 Transform
 * @param {Object} Collect.prototype
 * @param {Object} Transform.prototype
 */
Object.setPrototypeOf(Collect.prototype, Transform.prototype);

Collect.prototype._transform = function(chunk, encoding, done){
    this._data.push(chunk);
    done();
}

Collect.prototype._flush = function(done){
    // parse body
    var body = this._data.toString();
    // middlewares process
    if (this._middleware && this._middleware.length) {
        for(var mw of this._middleware) {
            body = mw.call(this, body);
        }
    }
    // pipe stream
    this.push(body);
    done();
}

/**
 * 中间件
 * @param  {function} mw 中间件函数
 * @return {stream}    Collect实例
 */
Collect.prototype.use = function(mw){
    this._middleware.push(mw);
    return this;
}

/**
 * 处理结果保存到文件
 * @param  {String} filename
 */
Collect.prototype.dest = function(filename, opts) {
    opts = opts || {};
    var dest = fs.createWriteStream(filename, {
        flags: opts.flags || 'a',
        encoding: opts.encoding || 'utf-8'
    });
    this.pipe(dest);
}

/**
 * 获取源数据
 * @param  {String} url
 * @param  {Object} opts
 * @return {stream} Transform stream.
 */
Collect.src = function(url, opts){
    // Options.
    opts = opts || {};
    // Collect instance
    var co = Collect();
    // Default user-agent
    var UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36';
    // Request params
    var params = {
        url: url,
        headers: {
            'User-Agent': opts.userAgent || UA
        },
        proxy: opts.proxy || '',
        gzip: true
    };
    // Set cookie
    if (opts.cookie) {
        var j = request.jar();
        var cookie = request.cookie(opts.cookie);
        j.setCookie(cookie, url);
        params.jar = j;
    }
    return request(params).pipe(co);
}

Collect.query = require('./lib/query');

module.exports = Collect;
