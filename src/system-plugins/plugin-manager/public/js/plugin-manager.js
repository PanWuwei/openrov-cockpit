(function (window, $, undefined) {
  'use strict';
  var PluginManager = function PluginManager(cockpit) {
    console.log('Loading Plugin Manager plugin.');
    this.cockpit = cockpit;
    this.rov = cockpit.rov;
    var self = this;
  };
  //private variables
  var _plugins = null;
  var clearPluginCache = function clearPluginCache() {
    _plugins = null;
  };
  PluginManager.prototype.listen = function listen() {
    var self = this;
    this.cockpit.on('plugin-manager.disablePlugin', function (plugin, fn) {
      self.disablePlugin(plugin, fn);
      self.saveSettings();
    });
    this.cockpit.on('plugin-manager.enablePlugin', function (plugin, fn) {
      self.enablePlugin(plugin, fn);
      self.saveSettings();
    });
    this.rov.on('settings-change.pluginmgr', function (settings) {
      //Only process the settings change if it is different than what we had.
      if (JSON.stringify(self.settings) == JSON.stringify(settings.pluginmgr)){
        return;
      }
      self.settings = settings.pluginmgr;
      var that = self;
      clearPluginCache();
      self.startPlugins();

    });
    this.startPlugins();
  };
  PluginManager.prototype.startPlugins = function startPlugins(fn) {
    var self=this;
    this.EnumerateControllablePlugins(function (items) {
      items.forEach(function (p) {
        if (p.isEnabled === true) {
          p.isEnabled = true;
          p.rawPlugin.isEnabled = true;
          if (p.canBeEnabled) {
            p.rawPlugin.enable();
          }
        } else {
          p.isEnabled = false;
          p.rawPlugin.isEnabled = false;
          if (p.canBeDisabled) {
            p.rawPlugin.disable();
          }
        }
      });
      if (typeof fn === 'function') {
        fn();
      }
    });
  };
  PluginManager.prototype.enablePlugin = function enablePlugin(plugin, fn) {
    this.EnumerateControllablePlugins(function (items) {
      items.forEach(function (p) {
        if (p.name === plugin && p.canBeEnabled) {
          if (p.isEnabled === false) {
            p.isEnabled = true;
            p.rawPlugin.isEnabled = true;
            p.rawPlugin.enable();
            if (typeof fn === 'function') {
              fn();
            }
          }
        }
      });
    });
  };
  PluginManager.prototype.disablePlugin = function disablePlugin(plugin) {
    this.EnumerateControllablePlugins(function (items) {
      items.forEach(function (p) {
        if (p.name === plugin && p.canBeDisabled) {
          if (p.isEnabled === true) {
            p.isEnabled = false;
            p.rawPlugin.isEnabled = false;
            p.rawPlugin.disable();
            if (typeof fn === 'function') {
              fn();
            }
          }
        }
      });
    });
  };
  PluginManager.prototype.saveSettings = function SaveSettings() {
    var self = this;
    this.EnumerateControllablePlugins(function (items) {
      var settingsToSave = {};
      items.forEach(function (item) {
        var result = {};
        settingsToSave[item.name] = {
          config: item.config,
          isEnabled: item.isEnabled
        };
      });
      self.rov.emit('plugin.settings-manager.saveSettings', { pluginmgr: settingsToSave });
    });
  };
  PluginManager.prototype.EnumerateControllablePlugins = function EnumerateControllablePlugins(callback) {
    var self = this;
    if (_plugins !== null) {
      callback(_plugins);
      return;
    }
    _plugins = this.cockpit.loadedPlugins.filter(function (plugin) {
    //  console.log('evaluating plugin for pluginmanager');
      if (plugin.Plugin_Meta !== undefined) {
        return true;
      }
    }).map(function (plugin) {

      var plugin_metadata = {};
      if (plugin.Plugin_Meta !== undefined) {
        plugin_metadata = {
          rawPlugin: plugin,
          config: {},
          isEnabled: plugin.Plugin_Meta.defaultEnabled !== 'undefined' ? plugin.Plugin_Meta.defaultEnabled : true,
          canBeEnabled: typeof plugin.enable == 'function',
          canBeDisabled: typeof plugin.disable == 'function',
          isTheme: plugin.isTheme == undefined ? false : plugin.isTheme,
          name: plugin.Plugin_Meta.name,
          viewName: plugin.Plugin_Meta.viewName
        };
      }
   
      //zip in the saved settings with the defaults defined in the plugin
      if (self.settings){
        if (plugin_metadata.name in self.settings) {
          Object.assign(plugin_metadata, self.settings[plugin_metadata.name]);
        }
      }      
      //option to async get additional properies from config here.
      return plugin_metadata;
    });
    self.cockpit.emit('plugin-manager.ControllablePluginsChanged',_plugins);
    callback(_plugins);
  };
  window.Cockpit.plugins.push(PluginManager);
}(window, jQuery));