import { Collection } from "discord.js";

// state, dict
export const loginSession = new Collection<string, Record<string, any>>();