define(['goo/entities/components/Component'],
/** @lends */
function(Component) {
	"use strict";

	/**
	 * @class Contains scripts to be executed each frame when set on an active entity
	 * @param {Array|JS} [scripts] A script or an array of scripts to attach to the entity.
	 */
	function ScriptComponent(scripts) {
		this.type = 'ScriptComponent';

		if (scripts instanceof Array) {
			this.scripts = scripts;
		} else if (scripts) {
			this.scripts = [scripts];
		} else {
			this.scripts = [];
		}
	}

	ScriptComponent.prototype = Object.create(Component.prototype);

	ScriptComponent.prototype.run = function(entity, tpf) {
		var script;
		for ( var i = 0, max = this.scripts.length; i < max; i++) {
			script = this.scripts[i];
			if (script && script.run && (script.enabled === undefined || script.enabled)) {
				script.run(entity, tpf);
			}
		}
	};

	return ScriptComponent;
});