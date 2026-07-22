import { HeadingConfig } from "../components/lakex/types";

const DefaultHeadingConfig: HeadingConfig = {
    generateHashLink: (url: string | URL, id: string) => {
        if (typeof url === 'string') {
            return url+"#"+id;
        }
        return url.href + '#' + id;
    },
    anchor: true,
    folding: true,
}

export default DefaultHeadingConfig;