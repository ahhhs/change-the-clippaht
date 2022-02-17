const { print } = require('../eazax/editor-main-util');
const EditorAPI = require('./editor-api');
module.exports = {
    'get-canvas-children': function (event, data) {
        Editor.log('Enter the scene!');
        var root = cc.find(data.root);
        if (!root) {
            Editor.log('未选中预制文件或路径错误!!!');
            return;
        }
        let path = findNodeChild([root], data.uuid, root.name, {});
        if (!path) {
            Editor.log('选中的node节点没有clip参数!!!');
            return;
        }
        //选中的节点
        let checkedNode = cc.find(path.nodeNames);
        let nodename = spliceTopStr(path.nodeNames);
        let nodeChildList = [nodename];
        load_all_object(root, path.nodeNames + '/', checkedNode, nodeChildList);
        path['nodeChildList'] = nodeChildList;
        if (event.reply) {
            event.reply(null, path);
        }
    },
};
/**
 * 找到选中的节点,返回路径
 * @param {*} nodeList
 * @param {*} uuid
 * @returns
 */
function findNodeChild(nodeList, uuid, nodeName, parentObj) {
    if (nodeList.length <= 0) {
        return null;
    }
    let list = [];
    let obj = parentObj;
    if (nodeName == nodeList[0].name) {
        //是根节点
        nodeName += '/';
        obj = {
            uuids: '',
            nodeNames: '',
        };
    } else if (nodeName != nodeList[0].parent.name + '/') {
        //不是根节点,并且
        nodeName += nodeList[0].parent.name + '/';
        obj = parentObj;
    }
    for (let j = 0; j < nodeList.length; j++) {
        for (let i = 0; i < nodeList[j].children.length; i++) {
            let child = nodeList[j].children[i];
            if (child.uuid == uuid) {
                nodeName += child.parent.name + '/';
                obj.uuids = uuid;
                nodeName += child.name;
                obj.nodeNames = nodeName;
            }
            list.push(child);
        }
    }
    if (obj.uuids != '') {
        // Editor.log("查看obj", obj);
        return obj;
    } else {
        return findNodeChild(list, uuid, nodeName, obj);
    }
}

function load_all_object(rootNode, rootUrl, root, nodeList) {
    for (let i = 0; i < root.childrenCount; i++) {
        let path = findNodeChild([rootNode], root.children[i].uuid, rootNode.name, {});
        if (path) {
            let str = path.nodeNames.toString();
            str = spliceTopStr(str);
            nodeList.push(str);
        }
        load_all_object(rootNode, rootUrl, root.children[i], nodeList);
    }
}
function spliceTopStr(str) {
    str = str.split('/');
    str.splice(0, 1);
    str = str.join('/');
    return str;
}
