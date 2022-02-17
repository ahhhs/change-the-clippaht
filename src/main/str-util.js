const StrUtil = {
    /**
     * 把头部的/减掉
     * @param {*} str 
     * @returns 
     */
    spliceTopStr(str) {
        str = str.split("/");
        str.splice(0, 1);
        str = str.join("/");
        return str;
    },
    /**
   * 把尾部的/减掉
   * @param {*} str 
   * @returns 
   */
    spliceTailStr(str) {
        str = str.split("/");
        str.splice(strs.length - 1, 1);
        str = str.join("/");
        return str;
    }
}

module.exports = StrUtil;