$( document ).ready(function() {
	app.init();
});

var app = {

	init : function(){
		var me = this;


		this.context 		= new (window.AudioContext || window.webkitAudioContext)();
		try {
			this.context.suspend();
		}catch(err){}

		
		this.analyser 		= this.context.createAnalyser();
		
		this.gainNode 		= this.context.createGain();
		this.gainNode.value	= 0.5;

		this.eqPresets 		= {
			pop 	: [-1,-1,0,1,2,2,1,0,-1,-1],
			classic : [2,1,1,1,-1,-1,0,1,1,1],
			jazz 	: [1,1,1,0,-1,-1,0,0,1,1],
			rock	: [2,2,1,1,-1,-1,0,1,1,1],
			normal	: [0,0,0,0,0,0,0,0,0,0],
			mute	: [-15,-15,-15,-15,-15,-15,-15,-15,-15,-15],
		}
		this.visualizer 	= 1;
		var timerId 		= setInterval(function(){ me.isPlaying ? me.updateInfo() : false }, 100)

		this.dom 			= {
			get : function(el){
				return this.elems[el] ? this.elems[el] : $(this.selectors[el]);
			},
			selector : function(el){
				return this.selectors[el];
			},
			elems : {},
			selectors : {
				dndArea 		: 'html',
				app 			: '#app',
				visualization 	: '#app__visualization',
				preTimer 		: '#app__pre-timer',
				lastTimer 		: '#app__last-timer',
				trackRange 		: '#app__track-range',
				fileInput 		: '#app__file-input',
				eqSelect 		: '#app__eq-select',
				eqSelectHidSpan : '#app__list-hidden span',
				eqSelectSelSpan : '#app__list-selected span',
				playBtn 		: '#app__play-button',
				playBtnI 		: '#app__play-button i',
				stopBtn 		: '#app__stop-button',
				track 			: '#app__track',
				artist			: '#app__author',
				fileName 		: '#app__file-info span',
				fileNameA 		: 'a#app__file-info',
				volume 			: '#app__volume',
				headerNote		: '#app__header-note',
				headerControls  : '#app__header-cntrls i'			
			}


		};

		this.reset();

		this.bindActions();
		this.initDropdown('normal');
		this.createStuffToPlay();
		
	},
	reset : function(){
		this.isPlaying 		= false;
		this.source 		= null;
		this.playingOffset 	= 0;
		this.playStart 		= 0;
		this.rawData 		= null;


	},
	bindActions : function(){
		var me = this;


		me.dom.get('dndArea').on('dragenter', function (e){
			e.stopPropagation();
			e.preventDefault();
		});
		me.dom.get('dndArea').on('dragleave', function (e){
			$(this).removeClass('dragover');
			e.stopPropagation();
			e.preventDefault();
		});
		me.dom.get('dndArea').on('dragover', function (e){
			e.stopPropagation();
			e.preventDefault();
			$(this).addClass('dragover');
		});
		me.dom.get('dndArea').on('drop', function (e)
		{
			e.stopPropagation();
			e.preventDefault();
			var files = e.originalEvent.dataTransfer.files;
			me.readFiles(files[0]);
			$(this).removeClass('dragover');
			me.time = new Date().getTime();
		});

		me.dom.get('fileInput').on('change',function(e){
			if(this.files[0]){
				me.time = new Date().getTime();
				me.readFiles(this.files[0]);
			}
		})
		
		me.dom.get('app').delegate(me.dom.selector('playBtn'), 'click', function(e){

			me.isPlaying ? me.stopPlaying() : me.createNewSource(true);
		});
		
		me.dom.get('app').delegate(me.dom.selector('stopBtn'), 'click', function(e){
			me.finishPlaying();
		});
		
		me.dom.get('app').delegate(me.dom.selector('headerControls'), 'click', function(e){

			 if(me.visualizer == 0){
			 	me.visualizer = 1; me.analyser.fftSize = 256;
			 }else{
			 	me.visualizer = 0; me.analyser.fftSize = 128;
			 }

			 if(!me.isPlaying&&me.playingOffset>0) me.drawCanvasShot(true);
		});
		
		me.dom.get('app').delegate(me.dom.selector('volume'), 'input', function(e) {
		
		    me.gainNode.gain.value = this.value;
		});
		
		me.dom.get('eqSelect').delegate(me.dom.selector('eqSelectHidSpan'), 'click', function(e){

			var select 	= $(this).closest(me.dom.selector('eqSelect'));
			var sid 	= $(this).attr('data-sid');
			
			select.find(me.dom.selector('eqSelectSelSpan')).html(sid);
			select.find(me.dom.selector('eqSelectHidSpan')).css({display:'block'})
			$(this).css({display:'none'});

			select.blur();
			me.setEq(sid);

		});
	},
	readFiles : function(file){
		var me = this;

    	
    	if(me.rawData){
    		if(me.isPlaying){
				me.stopPlaying();
    		}
    		me.reset(new Date().getTime() - me.time);
    	}
    	
    	me.file = file;
    	me.loadTags();

	    var reader = new FileReader();
	    reader.onload = function (e) {
	    	console.log('Start decode: ' + (new Date().getTime() - me.time) + 's.');
	        me.rawData = e.target.result;
	        me.decodeAudioData();
	    };
	    reader.onerror = function (e) {
	        console.error(e);
	    };
	    reader.readAsArrayBuffer(file);
	},
	decodeAudioData : function(){
		var me = this;
		var raw = me.rawData;


		me.context.decodeAudioData(raw, function (buffer) {

	        if (!buffer) {
	            console.error("failed to decode:", "buffer null");
	            return;
	        }

	        me.dom.get('headerNote').fadeOut();

	        me.buffer = buffer;
	        me.createNewSource(true);
	        

	    }, function (error) {
	    	console.error("failed to decode:", error);
	    });
	},
	createNewSource : function(start){
		var me = this;
		me.source = me.context.createBufferSource();
		me.source.buffer = me.buffer;
	    me.source.connect(me.filters[0]); //источник
	    me.source.onended = function(){me.finishPlaying();}

	    me.source.start(0,me.playingOffset);

    	me.drawCanvasShot();
    	try{
		    me.context.resume();    		
    	}catch(err){}

	    console.log('Start playing: ' + (new Date().getTime() - me.time)+'s.');
		
		me.playStart = me.context.currentTime;
		me.isPlaying = true;

		me.dom.get('playBtnI').removeClass().addClass('fa fa-pause');

	},
	createStuffToPlay : function(){


		var me = this;
		///////////equa

		var createFilter = function (frequency) {
			var filter = me.context.createBiquadFilter();
		     
			filter.type = 'peaking'; // тип фильтра
			filter.frequency.value = frequency; // частота
			filter.Q.value = 1; // Q-factor
			filter.gain.value = 0;
		  
			return filter;
		}



		var createFilters = function () {
			var frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
			var filters;
			      
			// создаем фильтры
			filters = frequencies.map(createFilter);
			      
			// цепляем их последовательно.
			// Каждый фильтр, кроме первого, соединяется с предыдущим.
			// Удачно, что reduce без начального значения как раз пропускает первый элемент.
			filters.reduce(function (prev, curr) {
				prev.connect(curr);
				return curr;
			});

			return filters;
		};



		//////////end equa

	   

		me.filters = createFilters();


	    	me.filters[me.filters.length - 1].connect(me.analyser); //эквалайзер
		    	me.analyser.connect(me.gainNode); //визуализация
					me.gainNode.connect(me.context.destination); //громкость

		/////////////////


	    me.analyser.fftSize = 256;
		var bufferLength = me.analyser.frequencyBinCount;
		me.dataArray = new Uint8Array(bufferLength);

	},
	drawCanvasShot : function(one){
		var me = app;

		var WIDTH = 400;
		var HEIGHT = 100;
		var canvas = me.dom.get('visualization')[0].getContext("2d");
		var bufferLength = me.analyser.frequencyBinCount;

		canvas.clearRect(0, 0, WIDTH, HEIGHT);

		if(me.visualizer==0){
			me.analyser.getByteTimeDomainData(me.dataArray);
			canvas.lineWidth = 2;
		    canvas.strokeStyle = '#cdd2d7';

			canvas.beginPath();
			var sliceWidth = WIDTH * 1.0 / bufferLength;
	      	var x = 0;

	      	for(var i = 0; i < bufferLength; i++) {
				   
			       var v = me.dataArray[i] / 128.0;
			       var y = v * HEIGHT/2;

			       if(i === 0) {
			    	canvas.moveTo(x, y);
			    }else{
			   		canvas.lineTo(x, y);
			    }

			    x += sliceWidth;
			}
			canvas.lineTo(WIDTH, HEIGHT/2);
		    canvas.stroke();

		}else{
			me.analyser.getByteFrequencyData(me.dataArray);
			var barWidth = (WIDTH / bufferLength);
			var barHeight;
			var x = 0;

			for(var i =0; i < bufferLength; i++) {

				barHeight = me.dataArray[i]/2;
						
				canvas.fillStyle = '#cdd2d7';
				canvas.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight);
				x += barWidth + 1;
			}	
		}

		if(one!==true){me.canvasAnimation = requestAnimationFrame(me.drawCanvasShot);}

	},
	stopPlaying : function(){
		var me = this;

		me.playingOffset += me.context.currentTime - me.playStart;
		
		if(typeof me.source != 'undefined'){
			

			me.source.disconnect();
			me.source.stop(0);
			try {
				me.context.suspend();
			}catch(err){}
		}
		cancelAnimationFrame(me.canvasAnimation);
		
		this.isPlaying = false;


		me.dom.get('playBtnI').removeClass().addClass('fa fa-play');

	},
	finishPlaying : function(){
		var me = this;

		me.stopPlaying();

		var canvas = me.dom.get('visualization')[0].getContext("2d");
		canvas.clearRect(0, 0, 400, 100);


		me.playingOffset = 0;
		me.playStart = 0;
		me.isPlaying = false;

		me.updateInfo();
	},
	updateInfo : function(){

		var me = this;

		var res = me.isPlaying ? me.playingOffset+me.context.currentTime-me.playStart : me.playingOffset;
		
		var duration = me.source.buffer.duration;

		me.dom.get('preTimer').html( (res>3600 ? parseInt(res/3600) + ':' : '') + parseInt((res % 3600) / 60).pad() + ':' + parseInt((res % 3600) % 60).pad());

		me.dom.get('lastTimer').html( '-'+((duration - res)>3600 ? parseInt((duration - res)/3600) + ':' : '') + parseInt(((duration - res) % 3600) / 60).pad() + ':' + parseInt(((duration - res) % 3600) % 60).pad());

		me.dom.get('trackRange').css({width:res*100/duration+'%'})

	},

	loadTags : function() {
		var me = this;

		url = me.file.name;

		ID3.loadTags(url, function() {
			var tags = ID3.getAllTags(url);
			me.dom.get('track').html(tags.title ? tags.title : '');
			me.dom.get('artist').html(tags.artist ? tags.artist : '');

			me.dom.get('fileName').html(me.file.name ? me.file.name : '');
			me.dom.get('fileNameA')[0].href = window.URL.createObjectURL(me.file);
			me.dom.get('fileNameA')[0].download = me.file.name;

			me.dom.get('fileNameA').css({display:'inline-block'});
		},{
        	tags: ["title","artist"],
        	dataReader: FileAPIReader(me.file)
    	});
    },

    setEq : function(preset){
    	var me = this;
    	me.filters.forEach(function(item,i){
    		item.gain.value = me.eqPresets[preset][i];
    	})
    },
    initDropdown : function(sid){
    	me = this;
    	var dropdown = '<div class="app__list-selected" id="app__list-selected"><span>';
    		dropdown += sid;
    		dropdown += '</span><i class="fa fa-sliders"></i></div><div class="app__list-hidden" id="app__list-hidden">';

    		$.each(me.eqPresets, function(name, val){
    			if(name==sid){
    				dropdown+='<span style="display:none;" data-sid="'+name+'">'+name+'</span>';
    			}else{
    				dropdown+='<span data-sid="'+name+'">'+name+'</span>';
    			}
    			
    		})
			dropdown += '</div>';

		me.dom.get('eqSelect').html(dropdown);
		
    }
}


Number.prototype.pad = function(size) {
	var s = String(this);
	while (s.length < (size || 2)) {s = "0" + s;}
	return s;
}