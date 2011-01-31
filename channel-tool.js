#!/usr/bin/env node
var xmpp = require('node-xmpp');
var ltx = require('ltx');
var config = require('./config');

var NS_PUBSUB = 'http://jabber.org/protocol/pubsub';
var NS_PUBSUB_EVENT = 'http://jabber.org/protocol/pubsub#event';
var NS_PUBSUB_OWNER = 'http://jabber.org/protocol/pubsub#owner';
var NS_PUBSUB_NODE_CONFIG = 'http://jabber.org/protocol/pubsub#node_config';
var NS_DATA = 'jabber:x:data';

var cl = new xmpp.Client(config.xmpp);

function oneShot(el) {
    var stanza = el.root();
    stanza.attrs.id = Math.ceil(Math.random() * 9999).toString();
    cl.send(stanza);

    cl.on('stanza', function(reply) {
	if (reply.attrs.id === stanza.attrs.id) {
	    console.info(reply.toString());
	    process.exit(0);
	} else {
	    console.info('Unmatched: ' + reply.toString());
	}
    });
}

function usage(s) {
    console.info("Usage: " + process.argv[0] + " " +
		 process.argv[1] + " " +
		 s);
    process.exit(1);
}

function readStdin(cb) {
    var stdin = process.openStdin(), data = '';
    stdin.setEncoding('utf8');

    stdin.on('data', function(chunk) {
	data += chunk;
    });

    stdin.on('end', function() {
	cb(data);
    });
}

cl.on('online', function() {
    var service, node, itemId;

    switch(process.argv[2]) {
    case 'create-node':
	service = process.argv[3];
	node = process.argv[4];
	if (service && node) {
	    oneShot(new xmpp.Element('iq', { type: 'set',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB }).
		    c('create', { node: node }));
	} else
	    usage("create-node <service> <node>");
	break;
    case 'subscribe-node':
	service = process.argv[3];
	node = process.argv[4];
	if (service && node) {
	    oneShot(new xmpp.Element('iq', { type: 'set',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB }).
		    c('subscribe', { node: node }));
	} else
	    usage("subscribe-node <service> <node>");
	break;
    case 'publish-item':
	service = process.argv[3];
	node = process.argv[4];
	itemId = process.argv[5];
	if (service && node) {
	    readStdin(function(data) {
		var itemEl = ltx.parse("<item>" + data + "</item>");
		if (itemId)
		    itemEl.attrs.id = itemId;

		oneShot(new xmpp.Element('iq', { type: 'set',
						 to: service }).
			c('pubsub', { xmlns: NS_PUBSUB }).
			c('publish', { node: node }).
			cnode(itemEl));
	    });
	} else
	    usage("publish-item <service> <node> [itemId]");
	break;
    case 'retract-item':
	service = process.argv[3];
	node = process.argv[4];
	itemId = process.argv[5];
	if (service && node && itemId) {
	    oneShot(new xmpp.Element('iq', { type: 'set',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB }).
		    c('retract', { node: node }).
		    c('item', { id: itemId }));
	} else
	    usage("retract-item <service> <node> <itemId>");
	break;
    case 'items':
	service = process.argv[3];
	node = process.argv[4];
	if (service && node) {
	    oneShot(new xmpp.Element('iq', { type: 'get',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB }).
		    c('items', { node: node }));
	} else
	    usage("items <service> <node>");
	break;
    case 'affiliations':
	service = process.argv[3];
	if (service) {
	    oneShot(new xmpp.Element('iq', { type: 'get',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB }).
		    c('affiliations', {}));
	    
	} else
	    usage("affiliations <service>");
	break;
    case 'subscriptions':
	service = process.argv[3];
	if (service) {
	    oneShot(new xmpp.Element('iq', { type: 'get',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB }).
		    c('subscriptions', {}));
	} else
	    usage("subscriptions <service>");
	break;
    case 'subscribers':
	service = process.argv[3];
	node = process.argv[4];
	if (service && node) {
	    oneShot(new xmpp.Element('iq', { type: 'get',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB_OWNER }).
		    c('subscriptions', { node: node }));
	} else
	    usage("subscribers <service> <node>");
	break;
    case 'get-config':
	service = process.argv[3];
	node = process.argv[4];
	if (service && node) {
	    oneShot(new xmpp.Element('iq', { type: 'get',
					     to: service }).
		    c('pubsub', { xmlns: NS_PUBSUB_OWNER }).
		    c('configure', { node: node }));
	} else
	    usage("get-config <service> <node>");
	break;
    case 'set-config':
	service = process.argv[3];
	node = process.argv[4];
	if (service && node) {
	    var xEl = new xmpp.Element('iq', { type: 'set',
					       to: service }).
		c('pubsub', { xmlns: NS_PUBSUB_OWNER }).
		c('configure', { node: node }).
		c('x', { xmlns: NS_DATA,
			 type: 'submit' }).
		c('field', { var: 'FORM_TYPE',
			     type: 'hidden' }).
		c('value').t(NS_PUBSUB_NODE_CONFIG).
		up().up();
	    var args = process.argv.slice(5);
	    while(args.length >= 2) {
		var field = args.shift();
		var value = args.shift();
		if (field && value)
		    xEl.c('field', { var: field }).
			    c('value').t(value);
	    }
	    oneShot(xEl);
	} else
	    usage("set-config <service> <node> <field1> <value1> [...]");
	break;
    default:
	usage("<create-node|subscribe-node|publish-item|retract-item|items|affiliations|subscriptions|subscribers|get-config|set-config|...> ...");
    }
});
