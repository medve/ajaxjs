var HelperFunctions = {

	dict_to_hash : function ( dict )
	//преобразует словарь в GET запрос
	{	
		var a = "#!";
		location.hash = this.encode_request(dict,a);
	},

	hash_to_dict : function ()
	{
		var hash = location.hash.slice(1);
		if(hash[0]) == "!"){
			hash = hash.slice(1);
		}
		return this.split_req(hash);
	},

	set_mult_checkboxes : function( obj )
	//sets groupped checkboxes by GET params
	{
		var get = this.GET_to_dict();
		var params = get[obj.attr("name")];
		if(params !== undefined){
			params = params.split("+");
			obj.each(function(){
				for(var i = 0; i < params.length; i++){
					if($(this).attr("value") == params[i]){
						$(this).prop("checked",true);
					}
				}
			});
		}
	},

	encode_request : function ( dict, a )
	//makes encoded URI from the dict
	{
		for(var i in dict){
			if(dict[i]!=""&&dict[i]!==undefined){
				a+=i+"="+dict[i]+"&";
			}
		}
		return encodeURI(a.slice(0,-1));
	},

	dict_to_GET : function ( dict )
	//преобразует словарь в GET запрос
	{	
		var a="?";
		return this.encode_request(dict,a);
	},

	split_req : function ( req )
	//makes dict from request value
	{
		req=req.split("&");
		var temp,
			dict = {};
		for(var i = 0;i < req.length; i++){
			temp = req[i].split("=");
			dict[temp[0]] = temp[1];
		}
		return dict;
	},

	GET_to_dict : function ()
	{
		var get = location.search.slice(1);
		return this.split_req(get);
	},

	template_render : function(tpl,context,cont)
	{
		var output = swig.render(tpl, { filename: tpl, locals: context});
		cont.html(output);
	},

	hash_from_form : function(load_class,form,form_elems)
	{
		location.hash  = dict_to_hash(get_form_values(form, form_elems));
	}
};

function LoadPageAJAX( tpl_file, template,need_init, top_button, bottom_button, page ) 
{
	this.form_elems = ["input[type=number]","input[type=text]",
							"select","input:checkbox:checked"];
	//selectors used for collecting form values
	this.first_page   = page === undefined ? 1 : page;
	this.last_page    = this.first_page;    
	this.current_page = this.last_page;
	this.has_prev     = this.first_page > 1;
	this.has_next     = true;
	this.is_empty     = false;
	this.load_top     = top_button === undefined;
	//is loading of previous pages active 
	this.load_bottom  = bottom_button === undefined;
	//is loading of next pages active
	this.afterLoadAjax = document.createEvent('Event');
	this.afterLoadAjax.initEvent('afterLoadAjax', true, true);
	this.afterFilterAjax = document.createEvent('Event');
	this.afterFilterAjax.initEvent('afterFilterAjax', true, true);
	//when loading is ok
	this.top_button    = top_button;
	this.bottom_button = bottom_button;
	this.filter_button = null;
	//click on this buttons activates loading
	this.button_after_filter = false;
	//is button for activation of loading after filterin needed
	this.empty         = null;
	//block for show that page is empty
	this.template      = template;
	//template for object creating and rules how to fill that
	this.data_loading  = false;
	this.data          = null;
	this.cont          = null;
	this.page_cont     = "<div class='obj_page' id='page_'><div>";
	this.scroll_event  = null;
	this.current_request = 0;
	this.filter_requests = [];
	this.need_init       = need_init === undefined ? false : need_init;

	swig.run(this.tpl_file, {}, this.template);

	this.init_page = function()
	{
		this.load_objects(true);
	}

 	this.load_next = function()
 	{
		this.last_page++;
		this.load_objects(true);
	};

	this.load_prev = function()
	{
		this.first_page--;
		this.load_objects(false);
	};

	this.load_bottom_off = function()
	{
		this.load_bottom = false;
	};

	this.load_bottom_on = function()
	{
		this.load_bottom = true;
	};

	this.load_top_on = function()
	{
		this.load_top = true;
	};

	this.load_top_off = function()
	{
		this.load_top = false;
	};

	this.scroll_on = function()
	{
		if(this.scroll_event === null){
			$(document).on("scroll",
				{load_class:this},this.on_scroll);
		}
	};

	this.scroll_off = function()
	{
		if(this.scroll_event !== null){
			$(document).off(this.scroll_event);
		}
	};

	this.hide_top_button = function()
	{
		if(this.top_button){
			this.top_button.hide();
		}
	}

	this.hide_bottom_button = function()
	{
		if(this.bottom_button){
			this.bottom_button.hide();
		}
	}

	this.has_next_prev = function(forward)
	{
		if(forward){
			this.has_next = data['has_next'];
		} else{
			this.has_prev = data['has_prev'];
		}
	};

	this.dispatch_load_events = function(filter)
	{
		if( filter ){
			document.dispatchEvent(this.afterFilterAjax);
		}
		else {
			document.dispatchEvent(this.afterLoadAjax);
		}
	};

	this.lock_data = function()
	{
		this.data         = null;
		this.data_loading = true;
	};

	this.unlock_data = function()
	{
		this.data_loading = false;
	};

	this.data_locked = function()
	{
		return this.data_loading;
	};

	this.set_first_page = function(page)
	{
		if(page > 0){
			this.first_page = page;
		} else{
			console.log("Invalid first page: " + page);
		}
	}

	this.set_last_page = function(page)
	{
		if(page > this.first_page){
			this.last_page = page;
		} else{
			console.log("Invalid last page: " + page);
		}
	}

	this.filter_objects = function()
	{
		this.empty.hide();
		this.set_first_page(1);
		this.set_last_page(1);
		this.load_top_off();
		this.load_bottom_off();
		$(document).one('afterFilterAjax',
			{ load_class: this },this.after_filter);
		this.load_objects(true,true);
	};

	this.add_request_ident = function(filter){
		this.current_request++;
		if(filter){
			this.filter_requests.push(this.current_request);
		}
	};

	this.set_data = function( forward,filter )
	{
		if(filter) {
			if(this.filter_requests.pop() != data['current_request']){
				return ;
			}
			this.filter_requests = [];
			this.cont.empty();
		}
		loader.is_empty = data['objects'] === undefined || !data['objects'].length;
		var page_num = forward ? this.last_page : this.first_page;
		var page = template_render(tpl,this.data['objects'],
				$(this.page_cont).attr("id","page_"+page_num));
		forward ? this.cont.append(page) : this.cont.prepend(page);
	};

	this.load_objects = function( forward, filter )
	{
		console.log("load objects");
		var loader = this,
		    page   = forward ? this.last_page : this.first_page;
		loader.lock_data()
		loader.add_request_ident(filter);
		var kwargs = hash_to_dict();
		kwargs['page'] = page; 
		kwargs['current_request'] = this.current_request; 
		$.getJSON(this.address,kwargs,function(data){
			loader.unlock_data();
			loader.data = data;
			loader.has_next_prev(forward);
			loader.set_data(forward,filter);
			loader.dispatch_load_events(filter);
		});
	};

	this.top_button_click = function( event )
	{
		event.preventDefault();
		var load_class = event.data.load_class;
		load_class.hide_top_button();
		load_class.load_prev();
		load_class.scroll_on();
		load_class.load_top_on();
	};

	this.bottom_button_click = function( event )
	{
		event.preventDefault();
		var load_class = event.data.load_class;
		load_class.hide_bottom_button();
		load_class.load_next();
		load_class.scroll_on();
		load_class.load_bottom_on();
	};

	this.filter_event = function( event )
	{
		event.preventDefault();
		console.log("filter_event");
		var load_class = event.data.load_class;
		HelperFunctions.hash_from_form(form, form_elems);
		load_class.scroll_off();
		load_class.hide_bottom_button();
		load_class.hide_top_button();
		load_class.load_bottom_off();
		load_class.load_top_off();
		load_class.filter_objects();
	};

	this.after_load_more = function( event )//Действия после "загрузить еще"
	{
		console.log("after load more");
		var load_class = event.data.load_class;
		if(load_class.has_next || load_class.first_page > 1){
			load_class.scroll_on();
		}
	};

	this.after_filter = function( event )//Действия после фильтрации
	{
		console.log("after filter");
		var load_class = event.data.load_class;
		if(load_class.has_next){
			if(load_class.button_after_filter){
				load_class.bottom_button.show();
			}
			else{
				load_class.scroll_on();
				load_class.load_bottom_on();
			}
		}
		load_class.is_empty ? load_class.empty.show() : load_class.empty.hide();
	};

	this.update_curpage_num = function(pages)
	{
		pages.each(function(){
			if($(this).offset.top >= $(document).scrollTop()){
				var h = HelperFunctions.hash_to_dict();
				h["page"] = $(this).attr("id").replace("page_","");
				HelperFunctions.dict_to_hash(h);
			}
		});
	}

	this.on_scroll = function( event )
	{
		console.log("scroll");
		var load_class = event.data.load_class;
		var page_class = $(load_class.page_cont).attr("class");
		var pages     = $("." + page_class);
		var last_idx  = pages.last().offset(),
			first_idx = pages.first().offset();
		load_class.update_curpage_num(pages);
		if( !load_class.data_locked() ){

			if((first_idx === undefined
				|| $(document).scrollTop() <= first_idx.top)
				&& load_class.load_top ){
					load_class.load_prev();	
			}

			if((last_idx === undefined
				|| $(document).scrollTop() 
				+ $(window).height() >= last_idx.top)
				&& load_class.load_bottom && load_class.has_next){
					load_class.load_next();	
			}
		}
	};

	this.set_filter_button = function(filter_button)
	{
		console.log(filter_button);
		this.filter_button = filter_button;
		this.filter_button.on("click",
			{load_class:this},this.filter_button_click);
	}

	if(this.need_init)
		$(document).on("ready",this.init_page);
	$(document).on('afterLoadAjax',{load_class:this},this.after_load_more);
	if(this.load_top || this.load_bottom)
		$(document).on("scroll",{load_class:this},this.on_scroll);
	if(!this.load_top && this.top_button !== null)
		this.top_button.on('click',{load_class:this},this.top_button_click);
	if(!this.load_bottom && this.bottom_button !== null)
		this.bottom_button.on("click",{load_class:this},this.bottom_button_click);	
}