define(function() {
	var StringUtil = {};

	StringUtil.endsWith = function(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};

	StringUtil.startsWith = function(str, prefix) {
		return str.indexOf(prefix) === 0;
	};

	StringUtil.capitalize = function(str) {
		return str.substring(0,1).toUpperCase()+str.substring(1);
	};

	StringUtil.getIndexedName = function(base, takenNames, separator){
		if (!separator) separator = '_'

		var re = RegExp(base+'(' + separator + '\\d+)?');
		var i;
		var index = 0;
		for (i in takenNames) {
			var name = takenNames[i]
			var m = re.exec(name);
			if (m) {
				if (m.length>1 && m[1]){
					var nidx = parseInt(m[1].substring(separator.length));
					if (nidx>=index) index = nidx+1;
				}
				else {
					index = 1;
				}
			}
		}
		
		return base + separator + index;
	}

	StringUtil.getUniqueName = function(desiredName, takenNames, separator) {
		if (takenNames.indexOf(desiredName)===-1)
			return desiredName;

		return StringUtil.getIndexedName(desiredName, takenNames, separator)
	}


	StringUtil.hashCode = function(str){
		var hash = 0;
		if (str.length == 0) return hash;
		for (i = 0; i < str.length; i++) {
			char = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return btoa(hash);
	}


	return StringUtil;
});
