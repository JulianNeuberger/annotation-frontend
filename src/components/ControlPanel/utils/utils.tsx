import { Token } from "../../../interfaces/interfaces.ts";

export const updateBioTagsForSelectedTokens = (entityType: string, tokensToUpdate: Token[]):Token[] => {
    return tokensToUpdate.map((token, index) => {
        const bioTag = index === 0 ? `B-${entityType}` : `I-${entityType}`;
        return { ...token, bio_tag: bioTag };
    });
};

export const resetBioTagsForTokens = (tokensToReset: Token[]): Token[] => {
    return tokensToReset.map(token => {
        return { ...token, bio_tag: "O" };
    });
};
