/**
 * Json Utils
 */
define([], function() {

    var JsonUtils = {

	/**
	 * Json 객체 사이즈 가져오기
	 * 
	 * @param pData - 사이즈 확인할 객체
	 */
	length : function(pData) {
	    var _k, _c = 0;
	    if ('string' === typeof pData) {

	    }
	    else {
		for (_k in pData) {
		    if (pData.hasOwnProperty(_k) || 'string' === typeof pData[_k]) {
			_c++;
		    }
		}
	    }
	    return _c;
	},

	/**
	 * 객체 빈값 체크
	 * 
	 * @param pData - 체크할 객체
	 * @returns Boolean - 빈값 여부
	 */
	isEmpty : function(pData) {
	    return 1 > this.length(pData);
	},

	/**
	 * 객체 빈값 체크
	 * 
	 * @param pData - 체크할 객체
	 * @returns Boolean - 빈값 여부
	 */
	isNotEmpty : function(pData) {
	    return !this.isEmpty(pData);
	}
    };

    return (JsonUtils);
});
