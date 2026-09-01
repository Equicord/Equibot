
function contentPrefix(authorId: string) {
    return `From <@${authorId}> (video muted):\n\n`;
}

export function buildContent(authorId: string, text: string) {
    return contentPrefix(authorId) + text;
}
