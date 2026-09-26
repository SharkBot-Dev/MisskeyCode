export function isValidDomain(domain: string) {
    if (typeof domain !== "string") return false;

    if (domain.length === 0 || domain.length > 253) {
        return false;
    }

    if (domain.endsWith(".")) {
        domain = domain.slice(0, -1);
    }

    const labels = domain.split(".");

    if (labels.length < 2) {
        return false;
    }

    for (const label of labels) {
        if (label.length < 1 || label.length > 63) {
            return false;
        }

        if (!/^[a-zA-Z0-9-]+$/.test(label)) {
            return false;
        }

        if (label.startsWith("-") || label.endsWith("-")) {
            return false;
        }
    }

    return true;
}