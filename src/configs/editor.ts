import { LakexEditorConfig } from "../components/lakex/types";
import DefaultAudioConfig from "./audio";
import DefaultCustomCardConfig from "./customCard";
import DefaultEnvAdapterConfig from "./envAdapter";
import DefaultFileConfig from "./file";
import DefaultHeadingConfig from "./heading";
import DeafultImageConfig from "./image";
import DefaultInputConfig from "./input";
import GetdeGetDefaultSlashConfig from "./slash";
import DefaultTocConfig from "./toc";
import DefaultViedoConfig from "./video";


const GetDefaultEditorConfig = (lan: 'zh-cn' | 'en-us'):LakexEditorConfig => {
    return {
        image: DeafultImageConfig,
        audio: DefaultAudioConfig,
        video: DefaultViedoConfig,
        envAdapter: DefaultEnvAdapterConfig,
        file: DefaultFileConfig,
        heading: DefaultHeadingConfig,
        input: DefaultInputConfig,
        slash: GetdeGetDefaultSlashConfig(lan),
        toc: DefaultTocConfig.editing,
        customCard: DefaultCustomCardConfig,
        
    }
}

export default GetDefaultEditorConfig