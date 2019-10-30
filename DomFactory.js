/** 
 * DomFactory v1.0.0
 * DOM element creation facilitor
 * https://github.com/devsseb/DomFactory
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var DomFactory = function (){

	var supportedObjects = [String, HTMLElement, Node, Array];

	// Observer for trigger onappend event
	var observer = new MutationObserver(function(records) {

		if (!onappendelements.length)
			return;

		for (var i = 0; i < records.length; i++) {
			for (var j = 0; j < records[i].addedNodes.length; j++) {
				if (records[i].addedNodes[j].nodeType == Node.TEXT_NODE)
					continue;

				for (var k = 0; k < onappendelements.length; k++) {
					if (self.inElement(records[i].addedNodes[j], onappendelements[k])) {
						onappendelements[k].dispatchEvent(appendEvent)
						delete onappendelements[k];
					}
				}
				onappendelements = onappendelements.filter(event => event)
				if (!onappendelements.length)
					return;
			}
			if (!onappendelements.length)
				return;
		}
		
	});
	observer.observe(document, {childList: true, subtree: true });
	var appendEvent = new Event('append');
	var createEvent = new Event('create');
	var onappendelements = [];

	/*
	 * Instantiables methods
	 *
	 */
	var self = function DomFactory(layouts, apis)
	{
		this.layouts = layouts || {};
		this.apis = apis || {};
	}

	self.prototype.addLayout = function(code, layout)
	{
		var codes = code.split('.');
		var layouts = this.layouts;
		for (var i = 0; i < codes.length - 1; i++) {
			code = codes[i];
			if (layouts[code] == undefined)
				layouts[code] = {};

			layouts = layouts[code];
		}

		layouts[codes[codes.length - 1]] = layout;

		return this;
	}


	self.prototype.addApi = function(code, api)
	{
		var codes = code.split('.');
		var apis = this.apis;
		for (var i = 0; i < codes.length - 1; i++) {
			code = codes[i];
			if (apis[code] == undefined)
				apis[code] = {};

			apis = apis[code];
		}

		apis[codes[codes.length - 1]] = api;

		return this;
	}

	self.prototype.getLayout = function(code)
	{

		var codes = code.split('.');
		var layout, api;
		var args = Array.prototype.slice.call(arguments, 1);

		for (var i = -1; i < codes.length; i++) {
			if (i == -1) {
				layout = this.layouts;
				api = this.apis;
			} else {
				layout = layout[codes[i]];
				if (api != undefined)
					api = api[codes[i]];
			}


			if (typeof layout == 'function')
				layout = layout.apply(this, args);
			if (typeof api == 'function')
				api = api.apply(this, args);
			
			if (layout == undefined) {
				console.error('[DomFactory] Layout "' + code + '" not found');
				return;
			}
				
		}

		api = api || {};

		var element = this.createElement(layout);
		var elements = element;
		if (!Array.isArray(elements))
			elements = [elements];

		for (var i = 0; i < elements.length; i++) {
			elements[i].setAttribute('layout', code);

			// Apply api
			self.elementApplyDefinition(elements[i], {api: api});

			elements[i].dispatchEvent(createEvent);
		}

		element.domfactoryinstance = this;

		return element;
	}

	/*
	 * Statics methods
	 *
	 */
	self.createElement = self.prototype.createElement = function(definition)
	{
		if (definition == undefined)
			definition = {};

		if (Array.isArray(definition))

			return self.createElementFromArray(definition);

		else if (definition instanceof HTMLElement)

			return self.createElementFromElement(definition);

		else if (typeof definition == 'string' || definition instanceof String)

			return self.createElementFromString(definition);

		return self.createElementFromDefinition(definition);

	}

	self.createElementFromArray = function(array)
	{
		var elements = [];
		for (var def, i = 0; def = array[i]; i++) {
			// Add definition to last element
			if (i == array.length - 1) {
			
				if (array.domfactorydefinition) {
					if (typeof def.set == 'function')
						def = def.set(array.domfactorydefinition);
					else {
						if (def.domfactorydefinition == undefined)
							def.domfactorydefinition = {};
						def.domfactorydefinition.assign(definition.domfactorydefinition);
					}
				}

			}

			elements.push(self.createElement(def));
		}
		return elements;
	}

	self.createElementFromElement = function(element)
	{
		// Get last child
		if (element.domfactorydefinition != undefined) {
			self.elementApplyDefinition(self.getElementLastChild(element), element.domfactorydefinition);
			delete element.domfactorydefinition;
		}

		return element;
	}

	self.createElementFromString = function(string)
	{
		var regex = /[> ]?(?:#\D[\w_-]*|\.[\w_-]+|\[([\w_-]+)(?:=(?:"([\s\S]*?)(?<!\\)"|([\s\S]*?)))?\]|[\w_-]*)/g;
		var returnDefinition = null;
		var lastDefinition = null;
		var match;

		var definition = {};
		var ii = 0;
		while ((match = regex.exec(string)) !== null) {

			if (match.index == string.length)
				break;

			var value = match[0];
			var firstChar = value.substr(0, 1);

			if (firstChar == '>' || firstChar == ' ') {
		
				if (lastDefinition)
					lastDefinition.children = definition;
				else
					returnDefinition = definition;

				lastDefinition = definition;
				definition = {};
				firstChar = (value = value.substr(1)).substr(0, 1);

			}


			if (firstChar == '#')
				definition.id = value.substr(1);
			else if (firstChar == '.') {
				if (!definition.class)
					definition.class = [];
				definition.class.push(value.substr(1));
			} else if (firstChar == '[') {

				var key = match[1];
				var value = '';
				if (typeof match[2] != 'undefined')
					value = match[2];
				if (typeof match[3] != 'undefined')
					value = match[3];

				definition[key] = value;

			} else if (value)
				definition.tag = value;
		}

		if (string instanceof String)
			if (string.domfactorydefinition != undefined)
				self.definitionAssign(definition, string.domfactorydefinition);

		if (lastDefinition)
			lastDefinition.children = definition;
		else
			returnDefinition = definition;

		return self.createElement(returnDefinition);

	}

	self.createElementFromDefinition = function(definition)
	{
		var element, lastChild = null;

		if (typeof definition.selector != 'undefined') {

			element = self.createElement(definition.selector);
			lastChild = self.getElementLastChild(element);

		} else

			element = lastChild = (definition.tag == 'text' ?
				document.createTextNode('') :
				document.createElement(definition.tag || 'div')
			);

		self.elementApplyDefinition(lastChild, definition);
		
		return element;
	}

	self.getElementLastChild = function(element)
	{
		var lastChild = element;
		while (lastChild.lastElementChild)
			lastChild = lastChild.lastElementChild;
		return lastChild;
	}

	self.definitionAssign = function(target, definition)
	{
		for (var attr in definition) {
			if (Array.isArray(target[attr])) {

				if (!Array.isArray(definition[attr]))
					definition[attr] = definition[attr].split(' ');
				target[attr] = target[attr].concat(definition[attr]);

			} else if (typeof target[attr] == 'object')

				Object.assign(target[attr], definition[attr]);

			else

				target[attr] = definition[attr];

		}

		return target;
	}

	self.elementApplyDefinition = function(element, definition)
	{
		if (typeof definition == 'string') {
			definition = {};
			definition[arguments[1]] = arguments[2];
		}

		for (var attr in definition) {

			var value = definition[attr];

			if (typeof value == 'function' && attr.substr(0, 2) != 'on')
				value = value.call(element, element);

			if (attr == 'tag' || attr == 'selector')
				continue;

			if (attr == 'children') {

				if (!Array.isArray(value))
					value = [value];
				
				var childrens = self.createElement(value);

				for (var child, i = 0; child = childrens[i]; i++) {
					if (child instanceof Node)
						element.appendChild(child);
				}

				continue;

			} else if (attr == 'class') {
			
				if (Array.isArray(value))
					value = value.join(' ');
				if (element.className)
					element.className+= ' ';
				element.className+= value;
				continue;

			} else if (attr == 'style' && typeof value != 'string') {
			
				for (var name in value)
					element.style[name] = value[name];
				
				continue;
			
			} else if (attr == 'text') {

				if (element.nodeType == Node.TEXT_NODE)
					element.nodeValue = value;
				else
					element.innerText = value;

				continue;

			} else if (attr == 'html') {

				element.innerHTML = value;

				continue;

			} else if (attr.substr(0, 2) == 'on') {

				attr = attr.substr(2);

				if (attr == 'append')
					onappendelements.push(element);

				element.addEventListener(attr, value, {options: {capture: true}});

				continue;


			} else if (attr == 'api') {

				if (element.api == undefined)
					element.api = {};

				for (var name in value) {
					if (name.substr(0, 2) == 'on')
						self.elementApplyDefinition(element, name, value[name])
					element.api[name] = value[name].bind(element);

				}

				continue;

			} else

				attr = attr.replace(/[A-Z]/g, l => '-' + l.toLowerCase());

			element.setAttribute(attr, value);

		}

		return element;
	}

	self.inElement = function(container, child)
	{
		if (container == child)
			return true;

		for (var i = 0; i < container.children.length; i++)
			if (self.inElement(container.children[i], child))
				return true;

		return false;
	}

	for (var object, i = 0; object = supportedObjects[i]; i++) {

		object.prototype.set = function(definition, value)
		{
			var self = this;
			if (typeof this == 'string')
				self = new String(this);

			if (self.domfactorydefinition && self.domfactorydefinition.children != undefined)

				// Set definition to last child
				self.domfactorydefinition.children = self.domfactorydefinition.children.set(definition, value);

			else {

				if (definition == undefined)
					definition = {};

				// Merge definition object
				if (!self.domfactorydefinition)
					self.domfactorydefinition = {};

				if (typeof definition != 'object') {
					definition = {};
					definition[arguments[0]] = value;
				}

				DomFactory.definitionAssign(self.domfactorydefinition, definition);

			}

			return self;

		}

		if (object.prototype.append)
			object.prototype.originalAppend = object.prototype.append;

		object.prototype.append = function(children)
		{
			if (this.originalAppend && children instanceof Node)
				return this.originalAppend(children);

			if (!Array.isArray(children ))
				children = Array.prototype.slice.call(arguments);

			return this.set('children', children);
		}

		object.prototype.on = function(name, callback)
		{

			var events = arguments[0];
			if (typeof events == 'string') {
				events = {};
				events[name] = callback;
			}

			var self = this;
			for (var name in events)
				self = self.set('on' + name, events[name]);

			return self;
		}

		object.prototype.createElement = function(definition, value)
		{
			if (definition != undefined)
				this.set.apply(this, arguments);
			return self.createElement(this);
		}

		object.prototype.getLayout = function(code)
		{

			if (!this.domfactoryinstance) {
				console.error('[DomFactory] This element does not come from a layout');
				return undefined;
			}

			return this.domfactoryinstance.getLayout.apply(this.domfactoryinstance, arguments);

		}


	}

	self.parseSelector = function(selectors)
	{
		selectors = selectors.replace(/§([\w-]+)/g, function(match, name) {
			return '[layout="' + name.replace(/[A-Z]/g, l => '.' + l.toLowerCase()) + '"]';
		});
		return selectors;
	};

	['querySelector', 'querySelectorAll', 'closest', 'matches'].forEach(funcName => {
		var func = HTMLElement.prototype[funcName];
		HTMLElement.prototype[funcName] = function(selectors) {
			return func.call(this, self.parseSelector(selectors));
		}
	});

	return self;
}();