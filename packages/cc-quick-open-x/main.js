'use strict';

let isOpen = false;

module.exports = {

  load() {
    // execute when package loaded
  },

  unload() {
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {
    'search'() {
      // send ipc message to panel
      if (!isOpen) {
        Editor.Panel.open('quick-open-x');
      } else {
        Editor.Ipc.sendToPanel('quick-open-x', 'quick-open-x:search');
      }
    },
    'panel-ready'() {
      isOpen = true;
    },
    'panel-close'() {
      isOpen = false;
    },
  },
};