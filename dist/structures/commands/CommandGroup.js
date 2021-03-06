"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const util_1 = require("util");
const Command_1 = require("./Command");
exports.withGroup = (groupName, ...cmdsOrSubGroups) => {
    return new CommandGroup(groupName).add(...cmdsOrSubGroups);
};
class CommandGroup {
    constructor(name, ...aliases) {
        this.commandIncrement = 0;
        this.groupIncrement = 0;
        this.commands = new discord_js_1.Collection();
        this.subGroups = new discord_js_1.Collection();
        this.commandAliasMap = new discord_js_1.Collection();
        this.groupAliasMap = new discord_js_1.Collection();
        this.name = name;
        this.aliases = aliases || [];
    }
    /**
     * Specifically add commands to the group
     * @param cmds Commands to add
     */
    addCommand(...cmds) {
        cmds.forEach((cmd) => {
            this.commands.set(cmd.options.name, cmd);
            if (cmd.options.aliases) {
                cmd.options.aliases.forEach((v) => this.commandAliasMap.set(v, cmd.options.name));
            }
        });
    }
    /**
     * Specifically add groups to the group
     * @param groups Groups to add
     */
    addGroup(...groups) {
        groups.forEach((group) => {
            this.subGroups.set(group.name, group);
            group.aliases.forEach((v) => this.groupAliasMap.set(v, group.name));
        });
    }
    /**
     * Adds commands & groups to the group
     * @param cmdsOrGroups Commands/groups to add
     */
    add(...cmdsOrGroups) {
        cmdsOrGroups.forEach((v) => {
            if (v instanceof Command_1.Command) {
                this.addCommand(v);
            }
            else {
                this.addGroup(v);
            }
        });
        return this;
    }
    /**
     * Dynamically remove a command from the group
     * @param cmds Command to remove
     */
    removeCommand(...cmds) {
        cmds.forEach((cmd) => {
            if (typeof cmd === "string") {
                this.commands.delete(cmd);
            }
            else {
                const i = this.commands.array().indexOf(cmd);
                if (i !== -1) {
                    this.commands.delete(this.commands.keyArray()[i]);
                }
            }
        });
    }
    /**
     * Finds a given command by iterating through the group and subgroups
     * @param commandName Name of the command to find
     */
    find(commandName) {
        const cmd = this.commands.find((v) => v.options.name ? v.options.name === commandName : false);
        if (cmd) {
            return cmd;
        }
        const iterCmd = this.subGroups
            .map((v) => v.find(commandName))
            .filter((v) => !util_1.isUndefined(v))
            .shift();
        if (iterCmd) {
            return iterCmd;
        }
        else {
            return iterCmd;
        }
    }
    /**
     * Find a command in a specific group by iterating through the group and specified subgroups
     * @param groupName Name of the group
     * @param command Name of the command
     */
    findInGroup(groupName, command) {
        if (groupName.length < 1) {
            return this.commands.get(command);
        }
        const group = this.subGroups.get(groupName.shift() || "");
        if (group) {
            return this.findInGroup(groupName, command);
        }
    }
    /**
     * Gets the depth of the last group that matches the given group names
     * @param groupNames
     * @param index
     */
    getDeepestGroup(groupNames, index = 0) {
        const nextGroup = groupNames[0];
        if (!nextGroup) {
            return index;
        }
        const group = this.subGroups.get(nextGroup);
        if (!group) {
            return index;
        }
        return group.getDeepestGroup(groupNames.slice(1), (index += 1));
    }
    /**
     * Looks for a command in the group and returns it, along with the depth of the command
     * @param args Arguments to look for commands in
     * @param index Current index
     */
    findFromArgs(args, depth = 1) {
        const nextGroup = args[0];
        const group = this.subGroups.get(nextGroup) ||
            this.subGroups.get(this.groupAliasMap.get(args[0]) || "");
        if (!nextGroup || !group) {
            const cmd = this.commands.get(args[0]);
            if (cmd) {
                return [cmd, depth];
            }
            const aliasedCmdName = this.commandAliasMap.get(args[0]);
            return aliasedCmdName
                ? this.commands.get(aliasedCmdName)
                    ? [this.commands.get(aliasedCmdName), depth]
                    : undefined
                : undefined;
        }
        return group.findFromArgs(args.slice(1), (depth += 1));
    }
    /**
     * Checks whether the group has an alias
     * @param name
     */
    alias(name) {
        return this.aliases ? this.aliases.indexOf(name) !== -1 : false;
    }
    /**
     * Defines a group alias
     * @param alias
     */
    defAlias(alias) {
        this.aliases.push(alias);
        return this;
    }
    /**
     * Fetch the command tree
     */
    fetchCommandTree() {
        return {
            commands: this.commands.array(),
            groups: this.subGroups.map((v) => v.fetchCommandTree()),
            name: this.name,
        };
    }
}
exports.CommandGroup = CommandGroup;
