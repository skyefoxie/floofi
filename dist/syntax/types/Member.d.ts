import { GuildMember, Message } from "discord.js";
import { FloofiClient } from "../../FloofiClient";
import { SyntaxType } from "../SyntaxType";
/**
 * Syntax type used to effectively disable syntax parsing.
 */
export declare class MemberType extends SyntaxType<GuildMember> {
    typeName: string;
    parse(client: FloofiClient, message: Message, arg: string, index: number): GuildMember;
}
