'use strict';

const FileUtil = require('../eazax/file-util');
const EditorAPI = require('./editor-api');
const Parser = require('./parser');
const Fs = require('fs');
const pathData = require('path');
module.exports = {
    load() {
        // execute when package loaded
    },

    unload() {
        // execute when package unloaded
    },

    // register your ipc messages here
    messages: {
        start() {
            findCurrentSelection();
        },
    },
};

async function findCurrentSelection() {
    Editor.log('------start running------');
    const resUuid = EditorAPI.getCurrentSelectedAssets();
    const nodeUuid = EditorAPI.getCurrentSelectedNodes();
    const resDataList = getResData(resUuid);
    Editor.log('resDataUrl==>:', resDataList);

    let resObj = analysisResDataUrl(resDataList[0]);
    // let data = resDataList[0].path.split('/');
    // let rootName = resDataList[0].path.split('/')[data.length - 1].split('.')[0];
    Editor.log('rootName==>:', resObj.rootName);
    Editor.Scene.callSceneScript(
        'change-the-clippath',
        'get-canvas-children',
        { root: resObj.rootName, uuid: nodeUuid },
        function (err, data) {
            Editor.log('SceneScriptData==>:', data);
            main(resDataList, data);
        }
    );
    // const clip = await analysisData(resDataList, nodeNameList[nodeNameList.length - 1]);
    // Editor.log('获得资源信息:', resDataList);
}
/**
 * 解析预制体资源路径
 */
function analysisResDataUrl(resDataList) {
    let obj = {
        data: '',
        rootName: '',
    };
    let separator = '/';
    if (resDataList.toString().indexOf('\\') > -1) {
        separator = '\\';
    }
    obj.data = resDataList.path.split(separator);
    obj.rootName = resDataList.path.split(separator)[obj.data.length - 1].split('.')[0];
    return obj;
}

async function main(resDataList, data) {
    const scipsObj = await analysisData(resDataList);
    let clipObj = await isSelectedClips(scipsObj.selected, scipsObj.scipsList);
    getClipLocalData(scipsObj.scipsList[clipObj.id], clipObj.clipData, data.nodeChildList);
}
/**
 * 通过uuid获得资源信息
 * @param {} resUuid
 * @returns
 */
function getResData(resUuid) {
    const resDataList = [];
    for (let i = 0; i < resUuid.length; i++) {
        let resData = EditorAPI.assetInfoByUuid(resUuid[i]);
        resDataList.push(resData);
    }
    return resDataList;
}
/**
 * 解析选中的数据
 * @param {*} resDataList
 */
async function analysisData(resDataList) {
    //选中的动画clips

    let obj = {
        selected: [],
        scipsList: [],
    };
    for (let j = 0; j < resDataList.length; j++) {
        let assetInfo = resDataList[j];
        if (assetInfo.type === 'animation-clip') {
            obj.selected.push(assetInfo.uuid);
        } else {
            let tree = await Parser.getNodeTree(assetInfo.path);
            for (let children = tree.children, i = 0, l = children.length; i < l; i++) {
                for (let k = 0; k < children[i].children.length; k++) {
                    obj.scipsList = findAnimation(children[i].components[k]);
                    findNodePath(children[i].children[k]);
                }
            }
        }
    }

    if (obj.selected.length == 0) {
        Editor.log('没有选择Clip文件!!!!');
    } else if (obj.scipsList.length == 0) {
        Editor.log('没有选择预制文件文件!!!!');
    }
    return obj;
}
/**
 * 获得本地文件信息
 * @param {*} params
 */
function getClipLocalData(clipUuid, clipData, clipListUrlName) {
    let url = Editor.assetdb.uuidToUrl(clipUuid);
    let urlList = url.split('/');
    urlList.splice(urlList.length - 1, 1);
    urlList = urlList.join('/');
    const path = Editor.assetdb.urlToFspath(url);
    let new_str = JSON.stringify(clipData);
    let new_json = JSON.parse(new_str);
    let objData = {};
    for (let k in new_json['curveData']['paths']) {
        for (let j = 0; j < clipListUrlName.length; j++) {
            //拆分路径
            let keyName = k.toString();
            keyName = keyName.split('/');
            keyName.splice(0, keyName.length - 1);
            keyName = keyName.join('/');
            let clipName = clipListUrlName[j].toString();
            clipName = clipName.split('/');
            clipName.splice(0, clipName.length - 1);
            clipName = clipName.join('/');

            if (keyName === clipName) {
                let key = clipListUrlName[j];
                objData[key] = new_json['curveData']['paths'][k];
                break;
            }
        }
    }
    new_json['curveData']['paths'] = objData;
    startSetData(path, new_json, urlList);
}
/**
 * 开始修改数据
 * @param {*} path 修改的文件路径
 * @param {*} new_json  修改的文件
 * @param {*} urlList  需要刷新的文件夹
 */
async function startSetData(path, new_json, urlList) {
    const pathDatas = pathData.join(Editor.Project.path + '/packages/change-the-clippath');
    const file = pathDatas + '/localdata.json';

    Fs.writeFile(file, JSON.stringify(new_json), 'utf-8', function (err) {
        if (err) {
            return Editor.error(err);
        }
        Editor.log('------back up data!------');
    });
    Fs.writeFile(path, JSON.stringify(new_json), 'utf-8', function (arr) {
        Editor.log('------modify successfully!------');
        Editor.assetdb.refresh(urlList, function (err, results) {
            Editor.log('updata asset!');
        });
    });
}

/**
 * 判断是否有选中的clips, 读取clip文件
 * @param {*} selected
 * @param {*} scipsList
 */
async function isSelectedClips(selected, scipsList) {
    // let clipData;
    let obj = {
        clipData: '',
        id: 0,
    };
    for (let i = 0; i < selected.length; i++) {
        for (let j = 0; j < scipsList.length; j++) {
            if (selected[i] == scipsList[j]) {
                let clipsData = EditorAPI.assetInfoByUuid(selected[i]);
                let file = await FileUtil.readFile(clipsData.path);
                let data = null;
                try {
                    data = JSON.parse(file);
                } catch (error) {
                    Editor.log('File parsing failure!', path);
                    Editor.log('Error:', error);
                }
                if (!data) {
                    return null;
                }
                obj.clipData = data;
                obj.id = j;
            }
        }
    }
    return obj;
}

/**
 * 获得节点路径
 * @param {*} data
 */
function findNodePath(data) {
    Editor.log('node path==>:', data.paht);
}
/**
 * 获得动画路径
 * @param {*} params
 */
function findAnimation(animation) {
    let clipsList = [];
    for (let i = 0; i < animation._clips.length; i++) {
        clipsList.push(animation._clips[i].__uuid__);
    }
    return clipsList;
}
