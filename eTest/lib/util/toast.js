/**
 * Toast
 */
define(['jquery'], function($) {

    /** Default Toast Duration */
    var TOAST_DURATION_DEFAULT = 1500;
    /** Short Toast Duration */
    var TOAST_DURATION_SHORT = 1000;
    /** Long Toast Duration */
    var TOAST_DURATION_LONG = 2000;

    // 토스트 표시 여부
    var _floatToast = false;

    /**
     * 토스트 출력
     * 
     * @param pBox -
     *                토스트 출력할 Dom 객체 또는 String
     * @param pCallback -
     *                토스트 출력 후 실행할 콜백
     */
    var _show = function(pBox, pCallback, pDuration) {
	var _this = this;
	if (null != pBox && !_this.floatToast) {

	    if ('string' === typeof pBox) {
		var _dl = [];

		_dl.push('<div class="tst_msg">');
		_dl.push('<div class="tst_alert"><div>' + pBox + '</div></div>');
		_dl.push('</div>');

		pBox = $(_dl.join(''));
	    }

	    pBox.css({
		'display' : 'none',
		'z-index' : 999999999
	    });
	    pBox.appendTo('body');

	    pBox.fadeIn(200, function(e) {
		_this._floatToast = true;

		setTimeout(function() {
		    pBox.fadeOut(300, function() {
			pBox.remove();

			if ('function' === typeof pCallback) {
			    pCallback();
			}

			_this.floatToast = false;
		    });
		}, pDuration);
	    });
	}
    }

    return {
	show: function(pBox, pCallback) {
	    _show(pBox, pCallback, TOAST_DURATION_DEFAULT);
	},
	short: function(pBox, pCallback) {
	    _show(pBox, pCallback, TOAST_DURATION_SHORT);
	},
	long: function(pBox, pCallback) {
	    _show(pBox, pCallback, TOAST_DURATION_LONG);
	}
    };
});
