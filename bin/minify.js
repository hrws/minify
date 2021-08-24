#!/usr/bin/env node

'use strict';

const Pack = require('../package');
const Version = Pack.version;

const log = function(...args) {
    console.log(...args);
    process.stdin.pause();
};

const Argv = process.argv;
const files = Argv.slice(2);
const [In] = files;

log.error = (e) => {
    console.error(e);
    process.stdin.pause();
};

process.on('uncaughtException', (error) => {
    if (error.code !== 'EPIPE')
        log(error);
});

minify();

function readStd(callback) {
    const {stdin} = process;
    let chunks = '';
    const read = () => {
        const chunk = stdin.read();
        
        if (chunk)
            return chunks += chunk;
        
        stdin.removeListener('readable', read);
        callback(chunks);
    };
    
    stdin.setEncoding('utf8');
    stdin.addListener('readable', read);
}

function minify() {
    if (!In || /^(-h|--help)$/.test(In))
        return help();
    
    if (/^--(js|css|html)$/.test(In))
        return readStd(processStream);
    
    if (/^(-v|--version)$/.test(In))
        return log('v' + Version);
    /** Mod to allow options file to be specified */
    if (m = /^(-o=|--option=)(.*)$/.exec(In)) {
        // handle options
        if (m[2] && m[2] != "") {
            files.shift();
            const data = await readFile(m[2], 'utf8');	
            opt = JSON.parse(data);
            if (opt && opt.js && opt.js.format && opt.js.format.preamble) {
                // search and replace [date] with current date string
                opt.js.format.preamble = opt.js.format.preamble.replace("[date]", 
                (new Date()).toISOString().substr(0,10));
            }
        }
    }
    
    uglifyFiles(files);
}

async function processStream(chunks) {
    const minify = require('..');
    const tryToCatch = require('try-to-catch');
    
    if (!chunks || !In)
        return;
    
    const name = In.replace('--', '');
    
    const [e, data] = await tryToCatch(minify[name], chunks);
    
    if (e)
        return log.error(e);
    
    log(data);
}

function uglifyFiles(files) {
    const minify = require('..');
    const mapfunc = (cur) => {return minify(cur, opt);}
    const minifiers = files.map(mapfunc);
    
    Promise.all(minifiers)
        .then(logAll)
        .catch(log.error);
}

function logAll(array) {
    for (const item of array)
        log(item);
}

function help() {
    const bin = require('../help');
    const usage = 'Usage: minify [options]';
    
    console.log(usage);
    console.log('Options:');
    
    for (const name of Object.keys(bin)) {
        console.log('  %s %s', name, bin[name]);
    }
}

