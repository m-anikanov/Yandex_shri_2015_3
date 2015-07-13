function log(q){
	console.log(q);
}

$( document ).ready(function() {
    app.init();
});

var app = {
	init : function(){
		var self = this;
		this.el = $('#app');
		var uploadTarget = '#dnd-area';
		log('init');
		this.el.delegate(uploadTarget, 'dragenter', function(e){
			e.stopPropagation();
			e.preventDefault();
			//$(this).css('background-color', 'green');
		});
		this.el.delegate(uploadTarget, 'dragover', function(e){
			e.stopPropagation();
			e.preventDefault();
		});
		this.el.delegate(uploadTarget, 'drop', function(e){			
			//$(this).css('background-color', 'blue');
			e.stopPropagation();
			e.preventDefault();
			
			var files = e.originalEvent.dataTransfer.files;
			self.readFiles(files[0]);
			
		});

		$(document).on('dragenter', function (e)
		{
			e.stopPropagation();
			e.preventDefault();
		});
		$(document).on('dragover', function (e)
		{
		  e.stopPropagation();
		  e.preventDefault();
		  //$(uploadTarget).css('background-color', 'green');
		});
		$(document).on('drop', function (e)
		{
			e.stopPropagation();
			e.preventDefault();
		});

		$('#file_input').on('change',function(e){
			
			self.readFiles(this.files[0]);
		})
	},
	readFiles : function(file){
		var self = this;
    

	    var reader = new FileReader();
	    reader.onload = function (e) {
	        console.log(e);
	        self.doMagic(e.target.result);
	    };
	    reader.onerror = function (e) {
	        console.error(e);
	    };
	    reader.readAsArrayBuffer(file);


	},
	doMagic : function(raw){

		var context = new(window.AudioContext || window.webkitAudioContext)();

	 	console.log("now playing a sound, that starts with", new Uint8Array(raw.slice(0, 10)));

	    context.decodeAudioData(raw, function (buffer) {

	        if (!buffer) {
	            console.error("failed to decode:", "buffer null");
	            return;
	        }

	        var source = context.createBufferSource();
	        source.buffer = buffer;
	        source.connect(context.destination);
	        source.start(0);
	        console.log("started...");
	        
	    }, function (error) {
	        console.error("failed to decode:", error);
	    });
	

	}


}