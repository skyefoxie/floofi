import { Message, User } from "discord.js";
import { FloofiClient } from "../../FloofiClient";
import { SyntaxType } from "../SyntaxType";
/**
 * Syntax type used to effectively disable syntax parsing.
 */
export declare class UserType extends SyntaxType<User> {
    typeName: string;
    parse(client: FloofiClient, message: Message, arg: string, index: number): User;
}
