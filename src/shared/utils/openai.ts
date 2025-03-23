import { Tiktoken } from "tiktoken/lite";
const o200k_base = require("tiktoken/encoders/o200k_base.json");

let encoder: Tiktoken;

const getEncoder = () => {
    if (!encoder) {
        encoder = new Tiktoken(
            o200k_base.bpe_ranks,
            o200k_base.special_tokens,
            o200k_base.pat_str
        );
    }
    return encoder;
};

export const countGPTToken = (text?: string) => {
    if (!text) {
        return 0;
    }
    return getEncoder().encode(text).length;
};
