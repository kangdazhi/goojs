define([
	'goo/statemachine/Util',
	'goo/statemachine/actions/Actions'
],
/** @lends */

function(
	Util,
	Actions
) {
	"use strict";

	/**
	 * @class
	 * @property {ArrayBuffer} data Data to wrap
	 */
	function TweenPositionAction(settings) {
		this.type = 'TweenPositionAction';

		settings = settings || {};

		this.entity = settings.entity || null;
		this.time = settings.time || 2000;
		this.event = settings.event || 'dummy';
		this.from = settings.from || {
			x: -5,
			y: 0,
			z: 0
		};
		this.to = settings.to || {
			x: 5,
			y: 0,
			z: 0
		};
		this.easing = settings.easing || TWEEN.Easing.Elastic.InOut;
		this.tween = new TWEEN.Tween();

		this.external = {
			entity: ['entity', 'Entity'],
			time: ['int', 'Time'],
			event: ['string', 'Send event'],
			from: ['json', 'From'],
			to: ['json', 'To'],
			easing: ['function', 'Easing']
		};
	}

	TweenPositionAction.prototype = {
		create: function(fsm) {
			var that = this;
			this.tween.from(Util.clone(this.from)).to(this.to, this.time).easing(this.easing).onUpdate(function() {
				if (that.entity !== null) {
					that.entity.transformComponent.transform.translation.setd(this.x, this.y, this.z);
					that.entity.transformComponent.setUpdated();
				}
			}).onComplete(function() {
				fsm.handle(this.event);
				console.log('complete:', this.event);
			}.bind(this)).start();
		},
		destroy: function() {
			this.tween.stop();
		}
	};

	Actions.register('TweenPositionAction', TweenPositionAction);
	return TweenPositionAction;
});