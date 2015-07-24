// jshint node:true
'use strict';

/*
 tern definition generator - shared a lot of code with modoc
 will have to refactor the common parts out
 */

/**
 Main file
 + parses comment line args
 + gets the source files to be processed
 + gets data for the index (nav bar)
 + gets the processed documentation
 + generates every -doc file
 + generates an index file (in this case Entity.js)
 + generates the changelog in a pretty format
 */

var fs = require('fs');
var glob = require('glob');
var _ = require('underscore');

var extractor = require('./extractor');
var jsdocProcessor = require('./jsdoc-processor');
var util = require('./util');

var typeParser = require('./type-expressions/type-parser');
var ternSerializer = require('./type-expressions/tern-serializer');


function processArguments() {
	if (process.argv.length < 4) {
		console.log('Usage: node tern.js <sourcePath> <outPath>');
	}

	return {
		sourcePath: process.argv[2],
		outPath: process.argv[3]
	};
}

var getFiles = function (sourcePath, ignore) {
	if (/\.js$/.test(sourcePath)) {
		return [sourcePath];
	}

	return glob.sync(sourcePath + '/**/*.js').filter(function (file) {
		return ignore.every(function (term) {
			return file.indexOf(term) === -1;
		});
	});
};

var args = processArguments();

var files = getFiles(args.sourcePath, ['goo.js', 'pack.js', 'logicpack', 'soundmanager', '+']);

function filterPrivates(class_) {
	var predicate = function (entry) {
		return entry.comment && !(entry.comment.private || entry.comment.hidden);
	};

	class_.members = class_.members.filter(predicate);
	class_.staticMembers = class_.staticMembers.filter(predicate);
	class_.methods = class_.methods.filter(predicate);
	class_.staticMethods = class_.staticMethods.filter(predicate);

	class_.hasMembers = class_.members.length > 0;
	class_.hasStaticMethods = class_.staticMethods.length > 0;
	class_.hasStaticMembers = class_.staticMembers.length > 0;
	class_.hasMethods = class_.methods.length > 0;
}

function compileDoc(files) {
	var classes = {};
	var extraComments = [];

	// extract information from classes
	files.forEach(function (file) {
		console.log('compiling tern definitions for ' + util.getFileName(file));

		var source = fs.readFileSync(file, { encoding: 'utf8' });

		var class_ = extractor.extract(source, file);

		Array.prototype.push.apply(extraComments, class_.extraComments);

		if (class_.constructor) {
			jsdocProcessor.all(class_, files);

			filterPrivates(class_);

			class_.file = file;

			classes[class_.constructor.name] = class_;
		}
	});

	// --- should stay elsewhere
	var constructorFromComment = function (comment) {
		jsdocProcessor.link(comment);
		return {
			name: comment.targetClass.itemName,
			params: _.pluck(comment.param, 'name'),
			comment: comment
		};
	};

	var memberFromComment = function (comment) {
		jsdocProcessor.link(comment);
		return {
			name: comment.targetClass.itemName,
			comment: comment
		};
	};

	var methodFromComment = constructorFromComment;
	var staticMethodFromComment = constructorFromComment;
	var staticMemberFromComment = memberFromComment;
	// ---

	// copy over the extra info from other classes
	// adding extras mentioned in @target-class
	extraComments.map(jsdocProcessor.compileComment)
	.forEach(function (extraComment) {
		var targetClassName = extraComment.targetClass.className;
		var targetClass = classes[targetClassName];

		if (!targetClass) {
			targetClass = {
				constructor: null,
				staticMethods: [],
				staticMembers: [],
				methods: [],
				members: []
			};
			classes[targetClassName] = targetClass;
		}

		switch (extraComment.targetClass.itemType) {
			case 'constructor':
				targetClass.constructor = constructorFromComment(extraComment);
				targetClass.requirePath = extraComment.requirePath.requirePath;
				targetClass.group = extraComment.group.group;
				break;
			case 'member':
				targetClass.members.push(memberFromComment(extraComment));
				break;
			case 'method':
				targetClass.methods.push(methodFromComment(extraComment));
				break;
			case 'static-member':
				targetClass.staticMembers.push(staticMemberFromComment(extraComment));
				break;
			case 'static-method':
				targetClass.staticMethods.push(staticMethodFromComment(extraComment));
				break;
		}
	});

	return classes;
}

// --- tern related ---
var convertParameters = function (parameters) {
	return parameters.filter(function (parameter) {
		// filter out sub-parameters of the form `settings.something`
		return parameter.name.indexOf('.') === -1;
	}).map(function (parameter) {
		return parameter.rawType ?
		parameter.name + ': ' + convert(parameter.rawType) :
			parameter.name;
	}).join(', ');
};

function compileFunction(fun, urlParameter) {
	var ternDefinition = {
		'!url': 'http://code.gooengine.com/latest/docs/index.html?' + urlParameter
	};

	// just for debugging
	try {
		if (fun.comment) {
			ternDefinition['!doc'] = fun.comment.description || '';
			if (fun.comment.param) {
				var ending = fun.comment.returns && fun.comment.returns.rawType ?
					') -> ' + convert(fun.comment.returns.rawType) :
					')';

				ternDefinition['!type'] = 'fn(' + convertParameters(fun.comment.param) + ending;
			}
		}
	} catch (e) {
		console.log(urlParameter);
		throw e;
	}

	return ternDefinition;
}

function compileMember(member, urlParameter) {
	var ternDefinition = {
		'!url': 'http://code.gooengine.com/latest/docs/index.html?' + urlParameter
	};

	// just for debugging
	try {
		if (member.comment) {
			ternDefinition['!doc'] = member.comment.description || '';
			if (member.comment.type) {
				ternDefinition['!type'] = convert(member.comment.type.rawType);
			}
		}
	} catch (e) {
		console.log(urlParameter);
		throw e;
	}

	return ternDefinition;
}

// this creates more trouble than it's worth
function compileProperty(property, urlParameter) {
	var ternDefinition = {
		'!url': 'http://code.gooengine.com/latest/docs/index.html?' + urlParameter
	};

	// just for debugging
	try {
		ternDefinition['!doc'] = property.description || '';
		if (property.type) {
			ternDefinition['!type'] = convert(property.type);
		}
	} catch (e) {
		console.log(urlParameter);
		throw e;
	}

	return ternDefinition;
}

function compileClass(class_) {
	var className = class_.constructor.name;

	// constructor
	var ternConstructor = compileFunction(class_.constructor, 'c=' + className);

	// static methods
	class_.staticMethods.forEach(function (staticMethod) {
		var id = 'h=_smet_' + className + '_' + staticMethod.name;
		ternConstructor[staticMethod.name] = compileFunction(staticMethod, id);
	});

	// static members
	class_.staticMembers.forEach(function (staticMember) {
		var id = 'h=_smbr_' + className + '_' + staticMember.name;
		ternConstructor[staticMember.name] = compileMember(staticMember, id);
	});

	ternConstructor.prototype = {};

	// methods
	class_.methods.forEach(function (method) {
		var id = 'h=_met_' + className + '_' + method.name;
		ternConstructor.prototype[method.name] = compileFunction(method, id);
	});

	// members
	// they sit on the prototype in tern because...
	class_.members.forEach(function (member) {
		var id = 'h=_mbr_' + className + '_' + member.name;
		ternConstructor.prototype[member.name] = compileMember(member, id);
	});

	// members provided as properties to the constructor
	// these generate a lot of trouble
	if (class_.constructor.comment && class_.constructor.comment.property) {
		class_.constructor.comment.property.forEach(function (property) {
			var id = 'h=_mbr_' + className + '_' + property.name;
			ternConstructor.prototype[property.name] = compileProperty(property, id);
		});
	}

	return ternConstructor;
}

function makeConverter(classNames) {
	var typesRegexStr = '\\b(' + classNames.join('|') + ')\\b';
	var typesRegex = new RegExp(typesRegexStr, 'g');

	return function (closureType) {
		var parsed = typeParser.parse(closureType);
		var ternType = ternSerializer.serialize(parsed);

		// perform the substitutions after the conversion as this inflates the string with `goo.` prefixes
		// should this prefixing be done on the expression in parsed form instead? why?
		return ternType.replace(typesRegex, 'goo.$1');
	};
}

// this is a bit of a hack
var convert;

function buildClasses(classes) {
	convert = makeConverter(Object.keys(classes));

	var classDefinitions = _.mapObject(classes, compileClass);

	var ternDefinition = {
		'!name': 'goo',
		'!define': {
			'Context': {
				'entity': '+goo.Entity',
				'world': '+goo.World',
				'entityData': '+object',
				'worldData': '+object',
				'domElement': '+Element',
				'viewportWidth ': 'number',
				'viewportHeight': 'number',
				'activeCameraEntity': '+goo.Entity'
			}
		},
		'args': '?',
		'ctx': 'Context',
		'goo': classDefinitions
	};

	var result = JSON.stringify(ternDefinition, null, '\t');

	fs.writeFileSync(args.outPath + util.PATH_SEPARATOR + 'tern-defs.json', result);
}

(function () {
	var classes = compileDoc(files);

	buildClasses(classes);

	console.log('tern definitions built');
})();