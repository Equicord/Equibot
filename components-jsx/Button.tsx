import { ButtonComponent, ComponentTypes, TextButton, URLButton } from "oceanic.js";

import { childrenToString } from "./utils";

export { ButtonStyles } from "oceanic.js";

type Button = Omit<TextButton, "type"> | Omit<URLButton, "type">;
export type ButtonProps = Button & { children?: any; };

export function Button({ label, children, ...props }: ButtonProps): ButtonComponent {
    return {
        type: ComponentTypes.BUTTON,
        label: childrenToString("Button", children) ?? label ?? undefined,
        ...props
    };
}
