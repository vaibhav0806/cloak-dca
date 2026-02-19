import { Config } from '@remotion/cli/config';
import path from 'path';

Config.setImageFormat('jpeg');
Config.setJpegQuality(90);
Config.setPublicDir(path.join(__dirname, 'public'));
