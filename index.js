#! /usr/bin/env node

'use strict';

//tape server/**/*.test.js common/**/*.test.js lib/**/*.test.js client/**/*.test.js


var path = require('path');
var glob = require('glob');
var fs = require('fs');
var Rx = require('rx');
var test = require('tape');
var xunitConverter = require('tap-xunit');

var testDirs = [
	'client',
	'common',
	'lib',
	'server'
];

var testReportDir = process.env['CIRCLE_TEST_REPORTS'];

function setupOutput() {

	if (testReportDir) {
		var resultsFile = path.join(testReportDir, 'results.xml');

		var writeStream = fs.createWriteStream(resultsFile);
		var converterStream = xunitConverter({});

		// This is here in-case any errors occur
		writeStream.on('error', function(err) {
			console.log(err);
		});

		test.createStream().pipe(converterStream).pipe(writeStream);

		// this is just here to make sure we cleaned up correctly (and when).
		test.onFinish(() => {
			converterStream.on('end', () => {
				console.log('Finished writing results');
			});
			converterStream.end();
		});

	}
}

// Must be called AFTER the Observer sequence is complete!
function executeTests() {

	console.log('Executing tests...');

	setupOutput();

	for (var testFile of tests) {
		console.log('Running test %s', testFile);

		require(testFile);
	}
}

var globRx = Rx.Observable.fromNodeCallback(glob);

var tests = [];

var source = Rx.Observable.from(testDirs)
	.flatMap(testDir => {
		var testPath = path.join(testDir, '**/*.test.js');

		console.log('Scanning test directory: %s', testDir);

		var options = {};

		return globRx(testPath);
	})
	.flatMap(x => x)
	.filter(testFile => testFile.length > 0);

var subscription = source.subscribe(
	function(testFile) {
		tests.push(path.resolve(process.cwd(), testFile));
	},
	function(e) { console.log('onError: %s', e); },
	executeTests);


