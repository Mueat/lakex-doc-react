import { EnvAdapter } from "../components/lakex/types";

const DefaultEnvAdapterConfig: EnvAdapter = {
    openLink: (url: string, isExternal: boolean) => {
        window.open(url, isExternal ? '__blank': '__self');
    },
    openMentionLink: (url: string, isExternal: boolean) => {
        window.open(url, isExternal ? '__blank': '__self');
    },
    longPressCard: (params: Record<string, any>) =>{
        console.log(params)
    }
}

export default DefaultEnvAdapterConfig;