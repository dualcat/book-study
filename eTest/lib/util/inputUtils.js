/**
 * Input Utils
 */
define([], function() {

    var InputUtils = {
	    
	/**
	* 키 숫자만 입력 체크
	* - 0 - 9숫자만 입력 가능 (229 키코드 통과 :: 모바일 디바이스 가상키보드)
	*/
	isNumberKey: function(pKeyCode) {
	    if ((47 < pKeyCode && 58 > pKeyCode) || (pKeyCode === 8 || pKeyCode === 46 || pKeyCode === 229)) {
		return true;
	    }

	    return false;
    	},
    	
    	/**
    	 * 키 영문 입력 체크
    	 */
    	isAlphabetKey: function(pKeyCode) {
	    if ((65 <= pKeyCode && 90 >= pKeyCode || 97 <= pKeyCode && 122 >= pKeyCode) || (pKeyCode === 8 || pKeyCode === 46)) {
		return true;
	    }
	    
	    return false;
	}
    
    
    };

    return (InputUtils);
});
