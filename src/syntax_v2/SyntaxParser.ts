import {
    Channel, GuildMember, Message, PartialGuild, Role, TextChannel, User, VoiceChannel
} from "discord.js";

import { FloofiClient } from "../client/FloofiClient";
import { SyntaxTypeOptions } from "../syntax/SyntaxType";
import { SyntaxParserError } from "./SyntaxParserError";
import { SyntaxType, SyntaxTypeConstructor } from "./SyntaxType";
import { StringType } from "./types/String";

// Type definitions
export type ParseableType =
	| boolean
	| number
	| string
	| Channel
	| GuildMember
	| PartialGuild
	| Role
	| TextChannel
	| User
	| VoiceChannel;

export type ParseableTypeRepresentation =
	| "boolean"
	| "number"
	| "string"
	| "channel"
	| "guild"
	| "member"
	| "role"
	| "user";

// Array of valid type names
const validTypes: ParseableTypeRepresentation[] = [
	"string",
	"boolean",
	"number",
	"channel",
	"member",
	"guild",
	"role",
	"user",
];

// Matching RegExps
const validStringTest = new RegExp(
	`[a-zA-z]+:(${validTypes.join("|")})(\?)?(\.{3})?`,
);
const typeNameMatcher = new RegExp(
	`[a-zA-z]+(?=:(${validTypes.join("|")})(\?)?(\.{3})?)`,
);
const typeMatcher = new RegExp(
	`(?<=[a-zA-z]+:)(${validTypes.join("|")})(?=(\?)?(\.{3})?)`,
);
const optionalMatcher = new RegExp(
	`(?<=[a-zA-z]+:(${validTypes.join("|")}))(\?)?(?=(\.{3})?)`,
);
const restMatcher = new RegExp(
	`(?<=[a-zA-z]+:(${validTypes.join("|")})(\?)?)(\.{3})?`,
);

type TypeMap<T> = { [P in keyof T]: T[P] };
const typeMap: { [x: string]: SyntaxTypeConstructor } = {
	string: StringType,
};

/**
 * Util function that creates types from string representations
 * @param type
 */
const createType = (
	name: string,
	type: ParseableTypeRepresentation,
	extras?: Partial<SyntaxTypeOptions>,
) => {
	return new typeMap[type](name, extras);
};

/**
 * Class for dealing with syntax parsing
 */
export class SyntaxParser<T extends ParseableType[]> {
	public syntax: Array<SyntaxType<T[number]>>;
	public flags: any[];

	public multiSyntax: boolean;

	// tslint:disable-next-line: variable-name
	private _syntax: string[];
	// tslint:disable-next-line: variable-name
	private _flags: Array<[string | string[], string]>;

	constructor(syntax: string | string[]) {
		if (syntax instanceof Array) {
			this.multiSyntax = true;
			this._syntax = syntax;
		} else {
			this.multiSyntax = false;
			this._syntax = syntax.split(" ");
		}

		this._flags = [];

		this.syntax = [];
		this.flags = [];

		this.refresh();
	}

	// #region SyntaxParser methods

	/**
	 * Add a syntax variant to the parser.
	 * @param syntax Syntax to add
	 */
	public addSyntax(syntax: string) {
		this._syntax.push(syntax);

		this.refresh();
		return this;
	}

	/**
	 * Remove a syntax variant from the parser.
	 * @param index Index of the variant
	 */
	public removeSyntax(index: number) {
		this._syntax.splice(index, 1);

		this.refresh();
		return this;
	}

	/**
	 * Add a flag to the syntax parser.
	 * @param flagName Name of the flag, and possible aliases
	 * @param syntax Syntax parsing to perform on the flag
	 */
	public addFlag(flagName: string | string[], syntax: string) {
		this._flags.push([flagName, syntax]);

		this.refresh();
		return this;
	}

	/**
	 * Remove a flag from the parser.
	 * @param flagName Name or alias of the flag
	 */
	public removeFlag(flagName: string) {
		const flagToRemove = this._flags.find((v) => {
			if (v[0] instanceof Array) {
				return v[0].reduce<boolean>(
					(equals, val, i) => (equals ? val === flagName : false),
					true,
				);
			}
			return v[0] === flagName;
		});

		if (!flagToRemove) {
			return this;
		}

		this._flags.splice(this._flags.indexOf(flagToRemove), 1);

		this.refresh();
		return this;
	}

	/**
	 * Parses message content into valid values
	 */
	public parse(client: FloofiClient, message: Message, args: string[]): T {
		const parsedSyntax: ParseableType[] = [];

		let onRestArgument = false;

		// Check if missing required arguments
		const missingOptionalArguments = this.syntax.reduce<null | number>(
			(failed, syntax, i) => {
				if (failed) {
					return failed;
				}

				// if syntax is required
				if (!syntax.isOptional) {
					// if no argument exists
					if (!args[i]) {
						return i;
					}
				}

				return null;
			},
			null,
		);

		// If there are missing required arguments, throw
		if (missingOptionalArguments) {
			throw new SyntaxParserError("PARSE_ERROR", {
				index: missingOptionalArguments,
				syntax: this.syntax[missingOptionalArguments],
			});
		}

		// If there are too many arguments
		if (
			args.length > this.syntax.length &&
			!this.syntax[this.syntax.length - 1].isOptional
		) {
			throw new SyntaxParserError("PARSE_ERROR", {
				arg: args[this.syntax.length],
				index: this.syntax.length,
			});
		}

		// Actual syntax parsing
		args.forEach((v, i) => {
			const syntaxIndex = onRestArgument ? i : this.syntax.length - 1;

			if (this.syntax[i].isRest) {
				onRestArgument = true;
			}
			parsedSyntax.push(
				this.syntax[syntaxIndex].parse(client, message, v, i),
			);
		});

		return parsedSyntax as T;
	}

	// #endregion

	//#region SyntaxParser Private Methods

	/**
	 * Refreshes the syntax types by checking if they have been updated.
	 */
	private refresh() {
		if (this._syntax.length !== this.syntax.length) {
			this.syntax = this._syntax.map((s) => this.createType(s));
		}

		if (this._flags.length !== this.flags.length) {
			this.flags = this._flags.map((f) => this.createFlag(f));
		}

		return this;
	}

	/**
	 * Creates a syntax type from a string.
	 * @param s String representation of the type
	 */
	private createType<S extends ParseableType>(
		s: string,
	): SyntaxType<ParseableType> {
		const valid = validStringTest.test(s);

		const typeMatch = s.match(typeMatcher);
		const typeNameMatch = s.match(typeNameMatcher);

		// Check if syntax string is valid

		if (!typeNameMatch) {
			throw new SyntaxParserError("INTERNAL_ERROR", {
				message: `Invalid type name`,
			});
		}

		if (!typeMatch) {
			throw new SyntaxParserError("INTERNAL_ERROR", {
				message: "Invalid type",
			});
		}

		if (!valid) {
			throw new SyntaxParserError("INTERNAL_ERROR", {
				message: "Invalid syntax string",
			});
		}

		const type = typeMatch[0] as ParseableTypeRepresentation;
		const typeName = typeNameMatch[0];

		const rest = restMatcher.test(s);
		const optional = optionalMatcher.test(s);

		return createType(typeName, type, { rest, optional });
	}

	/**
	 * Creates a syntax flag from a string
	 * @param f String representation of the flag
	 */
	private createFlag(f: [string | string[], string]) {
		return "";
	}
	//#endregion
}