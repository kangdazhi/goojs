define([
	'goo/statemachine/actions/Actions'
],
/** @lends */
function(
Actions
) {
	"use strict";

	/**
	 * @class
	 * @property {ArrayBuffer} data Data to wrap
	 */
	function TestAngleAction(settings) {
		this.type = 'TestAngleAction';

		settings = settings || {};

		this.entity = settings.entity || null;
		this.rangeMin = settings.rangeMin || 0;
		this.rangeMax = settings.rangeMax || Math.PI;
		this.eventInRange = settings.eventInRange || 'inRange';
		this.eventOutRange = settings.eventOutRange || 'outRange';

		this.external = [
		{
			name: 'Entity',
			key: 'entity',
			type: 'entity'
		},
		{
			name:'RangeMin',
			key:'rangeMin',
			type:'spinner'
		},
		{
			name:'RangeMax',
			key:'rangeMax',
			type:'spinner'
		},
		{
			name:'Event In Range',
			key:'eventInRange',
			type:'event'
		},
		{
			name:'Event Out Of Range',
			key:'eventOutRange',
			type:'event'
		}
		];
	}

	TestAngleAction.prototype = {
		update: function(fsm) {
			if (this.entity !== null && this.entity.body) {
				var angle = this.entity.body.GetAngle() % (Math.PI*2);
				if (angle < 0) {
					angle = Math.PI*2 + angle;
				}

				if (angle >= this.rangeMin && angle <= this.rangeMax) {
					fsm.handle(this.eventInRange);
				} else {
					fsm.handle(this.eventOutRange);
				}
			}
		}
	};

	Actions.register('TestAngleAction', TestAngleAction);
	return TestAngleAction;
});