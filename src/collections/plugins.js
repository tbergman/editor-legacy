define([
    "hr/hr",
    "hr/promise",
    "hr/utils",
    "models/plugin"
], function(hr, Q, _, PluginEntry) {
    var DEFAULT_PLUGINS = [
        "exercises", "quizzes", "mathjax"
    ];

    var Plugins = hr.Collection.extend({
        model: PluginEntry,

        /*
         *  Parse list of plugins from a book
         */
        parsePlugins: function(book) {
            var that = this;

            return book.readConfig()
            .then(function(config) {
                var plugins = config.plugins;
                var pluginsConfig = config.pluginsConfig || {};
                if (_.isString(plugins)) plugins = plugins.split(",");

                that.reset(_.map(plugins, function(plugin) {
                    return {
                        name: plugin,
                        config: pluginsConfig[plugin] || {}
                    };
                }));
            });
        },

        /*
         *  Add plugins to the books
         *      - extend book.json
         *      - extend package.json
         */
        toFs: function(book) {
            var that = this;
            var plugins = that.pluck("name");

            return book.readConfig()

            // Update book.json
            .then(function(config) {
                config.plugins = plugins;
                config.pluginsConfig = _.chain(that.models)
                .map(function(plugin) {
                    var pConfig = plugin.get("config");
                    if (_.size(pConfig) == 0) return null;
                    return [plugin.get("name"), pConfig];
                })
                .object()
                .value();

                return book.writeConfig(config);
            })

            // Update package.json
            .then(function() {
                return book.read("package.json")
                .fail(function() {
                    return "{}";
                })
                .then(JSON.parse);
            })
            .then(function(packageJson) {
                // Generate if non existant package.json
                packageJson.name = packageJson.name || "book";
                packageJson.version = packageJson.version || "0.0.0";
                packageJson.dependencies = packageJson.dependencies || {};

                // Don't add default plugins to package.json
                plugins = _.without.apply([plugins].concat(DEFAULT_PLUGINS));
                if (plugins.length == 0) return;

                _.each(function(plugins, plugin) {
                    plugin = "gitbook-plugin-"+plugin;
                    packageJson.dependencies[plugin] = packageJson.dependencies[plugin] || "*";
                });

                return book.write("package.json", JSON.stringify(packageJson, null, 4));
            });
        }
    });

    return Plugins;
});