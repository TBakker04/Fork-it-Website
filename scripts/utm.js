#!/usr/bin/env node
/* Builds a UTM-tagged link to the production site.
   Usage: node scripts/utm.js <source> <medium> <campaign>
   Example: node scripts/utm.js instagram story paella-nov
   Reads the domain from assets/analytics-config.js, so there's still
   only one place the domain is configured. */
'use strict';

var fs = require('fs');
var path = require('path');

function getDomain(){
  var configPath = path.join(__dirname, '..', 'assets', 'analytics-config.js');
  var text = fs.readFileSync(configPath, 'utf8');
  var match = text.match(/productionHostnames:\s*\[\s*['"]([^'"]+)['"]/);
  return match ? match[1] : 'forkit.nl';
}

function slugify(value){
  return String(value).trim().toLowerCase().replace(/\s+/g, '-');
}

var args = process.argv.slice(2);
var source = args[0];
var medium = args[1];
var campaign = args[2];

if (!source || !medium || !campaign){
  console.error('Usage: node scripts/utm.js <source> <medium> <campaign>');
  console.error('Example: node scripts/utm.js instagram story paella-nov');
  console.error('');
  console.error('source:   instagram, whatsapp, google_business, flyer, email');
  console.error('medium:   bio, story, post, reel, dm, qr');
  console.error('campaign: a short slug, e.g. paella-nov, always-on');
  process.exit(1);
}

var domain = getDomain();
var query = new URLSearchParams({
  utm_source: slugify(source),
  utm_medium: slugify(medium),
  utm_campaign: slugify(campaign)
});

console.log('https://' + domain + '/?' + query.toString());
