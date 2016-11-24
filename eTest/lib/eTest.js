"use strict";
define([ 'jquery', 'jqueryCounter', 'static/answer.static',
'util/jsonUtils', 'util/stringUtils', 'util/toast', 'spin' ], 
function($, counter, StaticForm, JsonUtils, StringUtils, Toast, Spin) {

    /** API HOST */
    var API_HOST = document.location.host;

    /** API KEY 세트정보 조회 */
    var API_KEY_PAGE_LIST = 'item-set';
    /** API KEY 아이템 페이지 정보 조회 */
    var API_KEY_GROUP_DETAIL = 'item-page';
    /** API KEY 다음 아이템 페이지 정보 조회 */
    var API_KEY_NEXT_PAGE = 'item-page-next';
    /** API KEY 메시지 */
    var API_KEY_MESSAGE = 'message';
    /** API KEY 답안 전송 */
    var API_KEY_ANSWER_SEND = 'answer';
    /** API KEY Pause */
    var API_KEY_PAUSE = 'evaluation.pause';
    /** API KEY Resume */
    var API_KEY_RESUME = 'evaluation.resume';
    /** API 리턴 결과 성공 코드 */
    var API_RESULT_SUCCESS = 0;
    /** API 비정상 종료 오류코드 */
    var API_RESULT_ERROR_END_EVAL = 1100;
    /** 일시정지 기본값 (5min) */
    var DEFALUT_PAUSE_TIME = 60*5;

    /** 문제유형 모듈명 - 정적유형 */
    var ANSWER_MODULE_NAME_STATIC = 'answer.static';
    /** 문제유형 모듈명 - 동적유형 */
    var ANSWER_MODULE_NAME_DYNAMIC = 'answer.dynamic';
    
    /** 튜토리얼 경로 */
    var MODULE_PATH_TUTORIAL = 'dynamic/tutorial/';
    

    // 세트정보 저장
    var _tmpItemSet = null;
    // 현제 문제 위치
    var _currentItemIndex = 0;
    // 현제 유형
    var _currentItemForm = null;
    
    // 네비게이션 영역 Dom
    var _navigationDom = null;
    // 콘텐츠 영역 Dom
    var _contentDom = null;
    // 브라우저 제어 컨펌 오픈 여부
    var _isSystemConfirm = false;

    // 타이머 영역 Dom
    var _timerDom = null;
    // 타이머 Selector (타이머객체 리셋용)
    var _timerSelector = null;
    
    // 풀이완료 여부
    var _isComplete = false;
    // 평가 문항로딩 완료 콜백
    var _testLoadComplete = null;
    // 문항 이동 컨펌창 콜백
    var _nextConfirm = null;
    // 답안 전송 오류 핸들러
    var _testFailSubmitAnswer = null;
    // 재 로딩 타이머용 Interval키 저장
    var _loadCompleteTimerKey = null;
    // 답안전송 처리중 여부 플래그
    var _procSubmitAnswer = false;
    
    // 튜토리얼 리스트
    var _tutorialList = [];
    // 튜토리얼 완료 콜백
    var _tutorialFinish = null;
    // 튜토리얼 문항로딩 완료 콜백
    var _tutorialLoadComplete = null;
    
    // 다국어 메시지 세팅
    var _msg = null;

    /**
     * API 호출
     * 
     * @param pOption.key -
     *                API KEY
     * @param pOption.data -
     *                파라메터
     * @param pOption.callback -
     *                콜백함수
     */
    var _execute = function(pOption) {

		var _options, _method, _url;
	
		switch (pOption.key) {
		case API_KEY_PAGE_LIST: {
		    _method = 'get';
		    _url = 'http://'+ API_HOST +'/api/'+ pOption.key.replace(/\./, '/') +'/'+ pOption.data.id;
		}
		    break;
		case API_KEY_MESSAGE:
		case API_KEY_GROUP_DETAIL:
		case API_KEY_NEXT_PAGE: {
		    _method = 'get';
		    break;
		}
	
		default:
		    _method = 'post';
		    break;
		}
	
		// Url 조합
		if (JsonUtils.isNotEmpty(pOption.data) && StringUtils.isNotEmpty(pOption.data.jsonUrl)) {
		    _url = pOption.data.jsonUrl;
		}
		
		if(StringUtils.isEmpty(_url)) {
		    _url = 'http://' + API_HOST + '/api/' + pOption.key.replace(/\./, '/');
		    _options = $.extend({
		    	data: JSON.stringify(pOption.data)
		    }, _options);
		}
		
		// 기본옵션 설정
		_options = $.extend({
		    contentType: "application/json; charset=utf-8",
		    type : _method,
		    url : _url,
		    success : function(pData) {
				if ('function' === typeof pOption.callback) {
				    pOption.callback(pData);
				}
		    },
		    error: function(pData, status, error) {
				if ('function' === typeof pOption.error) {
				    pOption.error(pData);
				}
		    }
		}, _options);
	
		// 타임아웃 추가설정
		if (undefined !== pOption.timeout) {
		    _options = $.extend({
		    	timeout: pOption.timeout
		    }, _options);
		}
		
		// Call API
		$.ajax(_options);
    },
    
    /**
     * API 메시지 바인딩
     */
    _bindMessage = function(){

    	_execute({
		    key : API_KEY_MESSAGE,
		    callback : function(pData) {
		    	
				if (API_RESULT_SUCCESS === pData.result) {
					if (null === _msg) {
						_msg = pData.data;
					}
				}
		    }
		});
    },

    /**
     * 세트정보 조회
     */
    _callPageList = function(pData, pCallback) {

		_execute({
		    key : API_KEY_PAGE_LIST,
		    data : pData,
		    callback : function(pData) {
	
				if (API_RESULT_SUCCESS !== pData.result) {
				    alert(pData.message);
				    if (!window.close()) {
				    	window.history.back()
				    };
				    return false;
				}
				
				// 전체 문항 수 세팅
				_navigationDom.find('#total').text(pData.data.totalCount);
		
				if (pData.data.isContinue) {
				    _alert(_msg['moveContinue'], function() {
						// 리스트 세팅
						_setSetInfo(pData);
						    
						if ('function' === typeof pCallback) {
						    pCallback(pData);
						}
				    });
				}
				else {
				    // 리스트 세팅
				    _setSetInfo(pData);
				    
				    if ('function' === typeof pCallback) {
				    	pCallback(pData);
				    }
				}
		    }
		});
    },

    /**
     * 페이지 상세정보 조회
     */
    _callPageDetail = function(pData) {

		_execute({
		    key : API_KEY_NEXT_PAGE,
		    data : pData,
		    callback : function(pResult) {
		    	
		    	if (0 !== pResult.result) {
		    		alert(_msg['systemError']);
		    		return false;
		    	}
			
				var _resultData = $.extend({}, pResult.data),
					_moduleUrl = pResult.data.moduleUrl;
				
				// Progress Start
				_showLoading();
				
				// 네비게이션 설정
				_navigationDom.find('#current').text(_resultData.orderNo);
		
				// 정적유형
				if ('N' === _resultData.dynamicYn) {
				    _loadStaticForm(_resultData);
				}
				// 동적유형
				else {
				    _loadDynamicForm(_resultData);
				}
				
				// 문항 카운트 저장  	
				_getCurrentPage().itemCount = _resultData.items.length;
				
				_loadCompleteTimerKey = setInterval(function() {
				    if (null !== _loadCompleteTimerKey) {
					
						// 재로딩 실패시
						_alert(_msg.failResourceLoading, function() {
						    
						    var _tmpReg = new RegExp(require.toUrl(''), 'g');
						    
						    // ModuleUrl 재설정
						    _resultData.moduleUrl = _moduleUrl.replace(_tmpReg, '');
						    
						    // 정적유형
						    if ('N' === _resultData.dynamicYn) {
						    	_loadStaticForm(_resultData);
						    }
						    // 동적유형
						    else {
						    	_loadDynamicForm(_resultData);
						    }
						});
				    }
				}, 30 * 1000);
		    }
		});
    },
    
    /**
     * 정적유형 폼 로딩
     */
    _loadStaticForm = function(pData) {
	
	_currentItemForm = new StaticForm(_contentDom);

	// 초기화
	_currentItemForm.init(pData);
	_currentItemForm.setItemPage(pData);
	
	// 로딩 완료 후 타이머 동작
	$(document).one('loadComplete', function() {
	    _loadItemComplete(pData);
	});
    },
    
    /**
     * 동적유형 폼 로딩 
     */
    _loadDynamicForm = function(pData) {
	
	var _loadErrorCount = 0;
	require([ pData.moduleUrl + ANSWER_MODULE_NAME_DYNAMIC, 
	          'text!' + pData.moduleUrl + 'template/' + ANSWER_MODULE_NAME_DYNAMIC + '.tmpl' ],
		function(DynamicForm, DynamicTemplate) {
		    _currentItemForm = new DynamicForm(_contentDom);

		    // ModuleUrl 재설정
		    var _tmpReg = new RegExp(require.toUrl(''), 'g'),
		    	_tmpModuleUrl = pData.moduleUrl.replace(_tmpReg, '');
		    
		    // 동적 유형일 경우 모듈경로, 템플릿 추가로 전달
		    _currentItemForm.init($.extend(pData, {
			moduleUrl : require.toUrl('') + _tmpModuleUrl,
			template : DynamicTemplate
		    }));
		    _currentItemForm.setItemPage(pData);
		}, function(error) {
		    _loadErrorCount++;

		    // 모듈 로딩 오류 발생 시 종료
		    if (1 < _loadErrorCount) {
			alert(_msg.failItemLoading);
		    }
		});
	
	// 로딩 완료 후 타이머 동작
	$(document).one('loadComplete', function() {
	    _loadItemComplete(pData);
	});
    },
    
    /**
     * 문제유형 로딩 완료
     */
    _loadItemComplete = function(pData) {

		// Progress 삭제
		_removeLoading();
		
		// 타이머 돔 설정되어 있을 경우
		if (_timerSelector) {
		    _initTimer(pData.session);
		}
		
		// 튜토리얼 로딩완료 콜백
		if ('function' === typeof _tutorialLoadComplete) {
		    _tutorialLoadComplete();
		}
		
		// 문제풀기 로딩완료 콜백
		if ('function' === typeof _testLoadComplete) {
		    _testLoadComplete();
		    
		    // 스크롤 복원
		    window.scrollTo(0, 0);
		    
		    // 위젯 초기화
		    $('#widget_cal,#widget_memo').hide();
		    $('a.widget_cal,a.widget_memo').removeClass('select');
		    
		    $('#widget_memo').find('textarea').val('');
		    $('#widget_cal').find('#answer_val')
		    	.data({
		    	    'operandA': [],
		    	    'operandB': [],
		    	    'operator': ''
		    	})
		    	.val('');  
		    
		    // 네비게이션 설정
		    _navigationDom.find('#current').text(pData.orderNo);
		}
		
		// 로딩 체크 타이머 키 초기화
		clearInterval(_loadCompleteTimerKey);
		_loadCompleteTimerKey = null;
    },

    /**
     * 페이지 정보 로딩
     */
    _loadItemPage = function() {
    	_drawTestSection(_getCurrentPage());
    },

    /**
     * 테스트 영역 구성
     */
    _drawTestSection = function(pData, pCallback) {
    	_callPageDetail(pData, pCallback);
    },

    /**
     * 문항 세트정보 세팅
     */
    _setSetInfo = function(pData) {
    	_tmpItemSet = pData;
    },
    
    /**
     * 문항 세트정보 리턴
     */
    _getSetInfo = function(pDate) {
    	return _tmpItemSet;
    },

    /**
     * 페이지 리스트 리턴
     */
    _getPageList = function() {
		if (undefined !== _tmpItemSet) {
		    return _tmpItemSet.data.pages;
		}
	
		return {};
    },
    
    /**
     * 현재 아이템 정보 가져오기
     */
    _getCurrentPage = function() {
    	return _getPageList()[_currentItemIndex];
    },
    
    /**
     * 현재 유형의 답안정보 가져오기
     */
    _getAnswer = function() {
    	return _currentItemForm.getAnswer();
    },

    /**
     * 현재 문항 답안 전송
     */
    _submitAnswer = function(pCallback) {
	
		if (_procSubmitAnswer) {
		    return false;
		}
		
		// 답안전송 진행 플래그 설정
		_procSubmitAnswer = true;
		
		var _page = _getCurrentPage(), 
		    _tmpAnswer = _currentItemForm.getAnswer(), 
		    _data = {};
	
		_data.id = _getSetInfo().data.id;
		_data.itemPageId = _page.id;
		_data.duration = _timerDom.data('session') - _timerDom.data('count');
		
		if (JsonUtils.isEmpty(_tmpAnswer)) {
		    
		    console.info('answer empty ', _currentItemForm.getItemPage());
		    
		    _data.answers = [];
		    
		    var _items = _currentItemForm.getItemPage().items;
		    
		    for (var i = 0; i < _items.length; i++ ) {
			_data.answers.push({
			    'itemId': _items[i].id,
			    'answer': []
			});
		    }
		}
		else {
		    _data.answers = _tmpAnswer;
		}
		
		_execute({
		    key: API_KEY_ANSWER_SEND,
		    data: _data,
		    timeout: 10 * 1000,
		    callback: function(pData) {
			
				_procSubmitAnswer = false;
				
				// 리스트 세팅
				if ('function' === typeof pCallback) {
				    pCallback(pData);
				}
			    },
			    error: function(pData) {
				
				_procSubmitAnswer = false;
				
				// timeout	
				if ('timeout' === pData.statusText) {
				    Toast.long(_msg.failSubmit,
		 			    function() {
							_testFailSubmitAnswer();
				    	});
				}
				else {
				    console.error('request error :: ', pData);
				}
		    }
		});
    },
    
    /**
     * 키 블락
     */
    _handleKeyBlock = function(e) {
	if (e.altKey || e.ctrlKey || e.metaKey || 116 === e.keyCode ||
		(82 === e.keyCode && e.ctrlKey) || (82 === e.keyCode && e.metaKey)) {
	    _alert(_msg.keyBlock);
	    return false;
	}
    },
    
    /**
     * 레이어 얼럿박스 노출
     */
    _alert = function(pMessage, pCallback) {
	// 레이어 얼럿 템플릿 로딩
	if (1 > $('#modal_wrap.alert').length) {
	    require([ 'text!template/alert.tmpl' ],
	    function(alertTemplate) {
			var _alertTmpl = $(alertTemplate);
			
			_alertTmpl.appendTo('#document');
			_alertTmpl.fadeToggle(150);
			_alertTmpl.find('#alertMessage').text(pMessage);
			
			_alertTmpl.find('#btnClose').on('click', function(e) {
				    e.preventDefault();
				    
				    _alertTmpl.remove();
				    
				    // 콜백 실행
				    if ('function' === typeof pCallback) {
					pCallback();
			    }
			});
	    });
	}
    },
    
    /**
     * 레이어 컨펌박스 노출
     */
    _confirm = function(pMessage, pCallback) {
	// 레이어 컨펌 템플릿 로딩
	if (1 > $('#modal_wrap.confirm').length) {
	    require([ 'text!template/confirm.tmpl' ],
		    function(confirmTemplate) {
		var _confirmTmpl = $(confirmTemplate);
		
		_confirmTmpl.appendTo('#document');
		_confirmTmpl.fadeToggle(150);
		_confirmTmpl.find('#confirmMessage').text(pMessage);
		
		// 취소
		_confirmTmpl.find('#btnClose').on('click', function(e) {
		    e.preventDefault();
		    
		    _confirmTmpl.remove();
		    
		    // 콜백 실행
		    if ('function' === typeof pCallback) {
			pCallback(false);
		    }
		});
		
		// 확인
		_confirmTmpl.find('#btnOk').on('click', function(e) {
		    e.preventDefault();
		    
		    _confirmTmpl.remove();
		    
		    // 콜백 실행
		    if ('function' === typeof pCallback) {
			pCallback(true);
		    }
		});
	    });
	}
    },

    /**
     * CTT-Answer 초기화
     * 
     * @param pSetId - 세트 아이디
     * @param pOption - 초기화 옵션 데이터
     */
    _init = function(pSetId, pOption) {
    	
    	// 메시지 바인딩
    	_bindMessage();

		// 문제 리스트 조회
		_callPageList({
		    id : pSetId
		}, _loadItemPage);
		
		// 옵션 설정
		if (JsonUtils.isNotEmpty(pOption)) {
		    // 타이머 영역 Dom 세팅
		    if (StringUtils.isNotEmpty(pOption.timerSelector)) {
				_timerSelector = pOption.timerSelector;
				_timerDom = $(_timerSelector);
		    }
		    
		    // 네비게이션 영역 Dom 세팅
		    if (StringUtils.isNotEmpty(pOption.navigationSelector)) {
			_navigationDom = $(pOption.navigationSelector);
		    }
		    
		    // 문제영역 Dom 세팅
		    if (StringUtils.isNotEmpty(pOption.contentSelector)) {
			_contentDom = $(pOption.contentSelector);
		    }
		}
		
		// 문항 로딩 완료 콜백 등록
		_testLoadComplete = pOption.loadComplete;
		
		// 문항 이동 컨펌창 콜백 등록
		_nextConfirm = pOption.nextConfirm;
		
		// 문항 답안제출 오류 콜백 등록
		_testFailSubmitAnswer = pOption.failSubmitAnswer;
		
		// 화면 이동시
		window.onbeforeunload = function (event) {
	
		    // 문제화면 가림막
		    var _ds = [];
		    _ds.push('<div id="modal_wrap" style="background-color:#e5ebe7;top:76px">');
		    _ds.push('</div>');
	
		    $('#document').append(_ds.join(''));
		    
		    window.scrollTo(0, 0);
		    
		    if (!_isComplete) {
			_isSystemConfirm = true;
				
				var message = _msg.warningExit;
	        	if (typeof event == 'undefined') {
	        	    event = window.event;
	        	}
	        	if (event) {
	        	    event.returnValue = message;
	        	}
	        	return message;
		    }
		};
		
		$(window).on('focus mouseover', function(){
		   if (_isSystemConfirm) {
		       $('#modal_wrap').remove();
		       _isSystemConfirm = false;
		   }
		});
	
		// 특수키, 마우스 오른클릭 방지
		$(window).on('contextmenu', function(){return false;});
		$(window).on('keydown', _handleKeyBlock);
		
		// 드래그 방지
	//	$(window).on('selectstart', function(){return false;})
	//	$(window).on('dragstart',function(){return false;});
    },
    
    /**
     * 튜토리얼 초기화
     */
    _initTutorial = function(pOption) {
	
		_tutorialFinish = pOption.finish;
		_tutorialLoadComplete = pOption.loadComplete;
	
		for (var i = 4; i > 0; i--) {
		    
		    var _tmpData = {
	                 moduleUrl: MODULE_PATH_TUTORIAL + i +'/',
			 collect: pOption.collect   
		    };
		    
		    _tutorialList.push(_tmpData);
		}
		
		// 옵션 설정
		if (JsonUtils.isNotEmpty(pOption)) {
		    // 문제영역 Dom 세팅
		    if (StringUtils.isNotEmpty(pOption.contentSelector)) {
			_contentDom = $(pOption.contentSelector);
		    }
		}
		
		var seq_arr=['#tut_step1','#tut_step2','#tut_step3','#tut_step4','#tut_step5'];
		for ( var j in seq_arr) {
		    (function(index) {
				setTimeout(function() {
				    $(index).fadeIn(300);
				}, 1700 * j);
		    })(seq_arr[j]);
		}
    },

    /**
     * 다음 문제로 이동
     */
    _next = function() {
		var _tmpAnswer = _currentItemForm.getAnswer(),
		    _procNext = function() {
				_timerDom.counter('stop');
				
				// 답안 전송
				_submitAnswer(function(pData) {
				    // 답안 전송 성공
				    if (API_RESULT_SUCCESS === pData.result) {
				    	
				    	// 마지막 풀이 문제인지 확인
						if (pData.data.isFinish) {
						    window.onbeforeunload = null;
						    document.location.href = '/eval/endTest.do?itemSetId='+ _getSetInfo().data.id;
						}
						else {
						    _currentItemIndex++;
						    _loadItemPage();
						}
				    }
				    else {
				    	console.log(pData.message);
				    }
				});
		    };
	
		// 시간초과 일 경우
		if (1 > _timerDom.data('count')) {
		    _procNext();
		}
		// 사용자 의도 시 체크
		else {
		    var _isAnswerComplete = true;
		    
		    // 동적 유형일 경우 추가체크
		    if ('Y' === _currentItemForm.itemPage.dynamicYn) {
			
				if (undefined !== _tmpAnswer[0] && undefined !== _tmpAnswer[0].answers[0]) {
				    var _answers = _tmpAnswer[0].answers[0].split('#');
				    
				    // # 구분자로 들어가면 그룹형으로 입력 여부 확인
				    for(var i in _answers) {
					
						if ('' === _answers[i] || undefined === _answers[i]) {
						    _isAnswerComplete = false;
						    break;
						}
				    }
				}
		    }
		    
		    if (_getCurrentPage().itemCount !== _tmpAnswer.length || !_isAnswerComplete) {
			
			_confirm(_msg.warningNext, function(pResult) {
			    
			    if (pResult) {
			    	_procNext();
			    }
			    else {
					_nextConfirm(false);
					return false;
			    }
			});
			
			return false
		    }
		    else {
		    	_procNext();
		    }
		}
    },

    /**
     * 튜토리얼 다음으로 이동
     */
    _nextTutorial = function() {
	
	if (1 > _tutorialList.length) {
	    _tutorialFinish();
	}
	else {
	    _loadDynamicForm(_tutorialList.pop());
	}
    },
    
    /**
     * 현재 문제유형 초기화
     */
    _reset = function() {
	_currentItemForm.reset();
    },

    /**
     * 타이머 초기화
     */
    _initTimer = function(pSecond) {
	
	// 타이머 객체 재생성
	_timerDom.each(function(i, o) {
	    var _o = $(o);

	    // Timer 삭제
	    if (undefined !== _o.data('counter') && 0 < _o.data('counter').intervalId) {
		clearInterval(_o.data('counter').intervalId);
	    }
	    
	    _o.replaceWith(_o.clone());
	});
	
	_timerDom = $(_timerSelector);
	_timerDom.css('color', 'white');
	
	// 분:초 포맷으로변환
	var _ms;
	
	pSecond = Number(pSecond);
	
	if (60 > pSecond) {
	    _ms = '00:'+ pSecond;
	}
	else {
	    var _minute, _second;
	    
	    _minute = Math.floor(pSecond / 60);
	    _second = (pSecond % 60);
	    
	    _ms = _minute +':'+ _second;
	}

	_timerDom.text(_ms);
	_timerDom.counter({})
	    .off('tick').on('tick', function(d) {
		var _t = $(d.target).text().split(':'), 
			_m = Number(_t[0]), _s = Number(_t[1]), 
			_ss = (_m*60) + _s;

		// 현재 카운트 저장
		_timerDom.data({
		    count: _ss
		});
		
		if (30 >= _ss) {
		    _timerDom.css('color', 'red');
		}
		
		if (10 === _ss) {
		    Toast.short(_msg.hurryup);
		}
		
		if (0 === _ss) {
		    _timerDom.css('color', 'white');
		    
		    // Layer alert, confirm 창 제거
		    $('#modal_wrap.confirm,#modal_wrap.alert').remove();
		    
		    _next();
		}
	    })
	    .data({
		'session': pSecond
	    });
    },
    
    /**
     * 문제풀이 일시정지 (Default: 5min), 1회만 사용가능
     */
    _pause = function() {
	
	// 일시정지
	var _pauseAction = function() {
	    _timerDom.counter('stop');
		
	    // 일시정지 템플릿 로딩
	    require([ 'text!template/pause.tmpl' ],
            function(pauseTemplate) {
		    
		var _pauseTmpl = $(pauseTemplate),
		    _pauseCounter, _minute, _second;
		    
		_pauseTmpl.appendTo('#document');
		    
		_minute = Math.floor(DEFALUT_PAUSE_TIME / 60);
		_second = (DEFALUT_PAUSE_TIME % 60);
		    
		_pauseTmpl.show();
		    
		// 카운터 값 등록
		_pauseTmpl.find('.counter').text(_minute + ':' + _second);
		_pauseTmpl.find('.counter').counter({})
			.on('counterStop', function() {
	    	    		_pauseTmpl.remove();
	    	    		_timerDom.counter('play');
		    	});
		    
		// 계속하기 버튼 이벤트 바인딩
		_pauseTmpl.find('#btnContinue').on('click', function() {
		    _resumeAction(_pauseTmpl);
		});
	    });
	},
	
	// 문항 계속하기
	_resumeAction = function(pTemplate) {
	    
	    // 타이머 중지
	    pTemplate.find('.counter').counter('stop');
	    
	    _execute({
		key: API_KEY_RESUME,
		data: {
		    id: _getSetInfo().data.id
		},
		callback: function(pData) {
		    if (API_RESULT_SUCCESS === pData.result) {
			pTemplate.remove();
			_timerDom.counter('play');
		    }
		    else {
			_alert(pData.message);
			return false;
		    }
		}
	    });
	}
	
	// Pause 등록 호출
	_execute({
	    key: API_KEY_PAUSE,
	    data: {
		id: _getSetInfo().data.id
	    },
	    callback: function(pData) {
		
		if (API_RESULT_SUCCESS === pData.result) {
		    _pauseAction();
		}
		else {
		   Toast.show(pData.message);
		    return false;
		}
	    }
	});
    },
    
    /**
     * 메모 위젯 열기
     */
    _openMemo = function() {
	
	// 메모위젯 템플릿 로딩
	if (1 > $('#widget_memo').length) {
	    require([ 'text!/answer/lib/template/memo.tmpl' ],
		    function(memoTemplate) {
		var _memoTmpl = $(memoTemplate);
		
		_memoTmpl.appendTo('#document');
		_memoTmpl.fadeToggle(150);
		
		_memoTmpl.find('.wid_close').on('click', function(e) {
		    e.preventDefault();
		    
		    $('a.widget_memo').removeClass('select');
		    _memoTmpl.hide();
		});
		
		// 드래그 이벤트
		_memoTmpl.draggable({
		    opacity : 0.7,
		    handle : '.widget_handle'
		});
	    });
	}
	else {
	    $('#widget_memo').fadeToggle(150);
	}
	    
    },
    
    /**
     * 계산기 초기화
     */
    _initCal = function(pTarget) {
	
	var _pads = pTarget.find('a'),
	    _disp = pTarget.find('#answer_val');
	
	var _operation = function(pTarget) {
		var _operandA = pTarget.data('operandA'),
	    	_operandB = pTarget.data('operandB'),
	    	_operator = pTarget.data('operator');
		
		if ('' === _operandB.join('')) {
		    return false;
		}

		if ('÷' === _operator) {
		    _operator = '/';
		}
		else if ('×' === _operator) {
		    _operator = '*';
		}
		else if ('－' === _operator) {
		    _operator = '-';
		}
		else if ('＋' === _operator) {
		    _operator = '+';
		}

		var _eval = eval(_operandA.join('') + _operator + _operandB.join(''));

		pTarget.data({
		    'operandA' : ('' + _eval).split(''),
		    'operandB' : [],
		    'operator' : ''
		});

		pTarget.val(_eval);
	    };
	
	_disp.data({
	    'operandA': [],
	    'operandB': [],
	    'operator': ''
	})
	
	$.each(_pads, function(i, o) {
	    
	    var _o = $(o),
	    	_checkNumber = (new RegExp(/[0-9]|\./));
	    
	    _o.on('click', function(e) {
		e.preventDefault();
		
		var _padVal = _o.text();
		
		
		// Clear
		if ('C' === _padVal) {
		    _disp
		    	.data({
		    	    'operandA': [],
		    	    'operandB': [],
		    	    'operator': ''
		    	})
		    	.val('');   
		    
		}
		else if ('=' === _padVal) {
		    _operation(_disp);
		}
		else if (_checkNumber.test(_padVal)) {
		    var _operandA = _disp.data('operandA'),
		    	_operandB = _disp.data('operandB'),
		    	_operator = _disp.data('operator'),
		    	_dispOper = [];
		    
		    if (
			    ('.' === _padVal && -1 < _operandA.indexOf('.')) || 
			    ('.' === _padVal && -1 < _operandB.indexOf('.'))) {
			return false;
		    }
		    else {
			
			if (StringUtils.isEmpty(_operator)) {
			    _operandA.push(_padVal);
			    
			    _dispOper = _operandA;
			}
			else {
			    _operandB.push(_padVal);
			    
			    _dispOper = _operandB;
			}
		    }
		    
		    _disp.val(_dispOper.join(''));
		}
		// 연산자 클릭
		else {
		    _operation(_disp);
		    
		    _disp.data({
			'operator': _padVal
		    });
		}
	    });
	});
	
    },
    
    /**
     * 계산기 위젯 열기
     */
    _openCal = function() {
	
	// 메모위젯 템플릿 로딩
	if (1 > $('#widget_cal').length) {
	    require([ 'text!/answer/lib/template/cal.tmpl' ],
		    function(calTemplate) {
		var _calTmpl = $(calTemplate);
		
		// 계산기 초기화
		_initCal(_calTmpl);
		
		_calTmpl.appendTo('#document');
		_calTmpl.fadeToggle(150);
		
		_calTmpl.find('.wid_close').on('click', function(e) {
		    e.preventDefault();
		    
		    $('a.widget_cal').removeClass('select');
		    _calTmpl.hide();
		});
		
		// 드래그 이벤트
		_calTmpl.draggable({
		    opacity: 0.7,
		    handle: '.widget_handle'
		});
	    });
	}
	else {
	    $('#widget_cal').fadeToggle(150);
	}
    },
    
    /**
     * 문항 단건 열기
     */
    _openItem = function(pOption) {
	
		// 문제영역 Dom 세팅
		if (StringUtils.isNotEmpty(pOption.contentSelector)) {
		    _contentDom = $(pOption.contentSelector);
		}
		    
		_loadDynamicForm(pOption.data);
    },
    
    /**
     * 로딩 보여주기
     */
    _showLoading = function() {
   	 // document 아래  만들기
   	 var _ds = [];
   	 _ds.push('<div id="modal_wrap" class="loading">');
   	 _ds.push('</div>');
   	 
   	 $('#document').append(_ds.join(''));
   	 
   	 var opts = {
   			  lines: 13 // The number of lines to draw
   			, length: 28 // The length of each line
   			, width: 14 // The line thickness
   			, radius: 41 // The radius of the inner circle
   			, scale: 0.5 // Scales overall size of the spinner
   			, corners: 1 // Corner roundness (0..1)
   			, color: '#000' // #rgb or #rrggbb or array of colors
   			, opacity: 0.25 // Opacity of the lines
   			, rotate: 0 // The rotation offset
   			, direction: 1 // 1: clockwise, -1: counterclockwise
   			, speed: 1 // Rounds per second
   			, trail: 60 // Afterglow percentage
   			, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
   			, zIndex: 2e9 // The z-index (defaults to 2000000000)
   			, className: 'spinner' // The CSS class to assign to the spinner
   			, top: '50%' // Top position relative to parent
   			, left: '50%' // Left position relative to parent
   			, shadow: false // Whether to render a shadow
   			, hwaccel: false // Whether to use hardware acceleration
   			, position: 'absolute' // Element positioning
		};
   	 
   	var target = document.getElementsByClassName('loading')[0];
   	var spinner = new Spin(opts).spin(target);
    },
    
    /**
     * 로딩 숨기기
     */
    _removeLoading = function() {
   	$('#document').find('.loading').remove();
    }
    
    return {
	init : function(pSetId, pOption) {
	    _init(pSetId, pOption);
	},
	
	initTutorial: function(pOption) {
	    _initTutorial(pOption);
	},

	next : function() {
	    _next();
	},
	
	nextTutorial: function() {
	    _nextTutorial();
	},

	pause : function() {
	    _pause();
	},
	
	openCal: function() {
	    _openCal();
	},
	
	openMemo: function() {
	    _openMemo();
	},
	
	openItem: function(pOption) {
	    _openItem(pOption);
	},
	
	getAnswer: function() {
	    return _getAnswer();
	}
    }
});