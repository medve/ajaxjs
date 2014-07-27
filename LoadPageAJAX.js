var HelperFunctions = {
	email_re	:  /^\w+@\w+\.[A-Za-z]+$/,
	phone_re	:  /^\+7\(\d{3}\)\d{3} \d{4}$/,
	anything	:  /.*/,
	anything_req:  /.+/,
	address_req :  /^\d{1,4}[\D\S]{0,2}$/,
	address     :  /^\d{0,4}[\D\S]{0,2}$/,
	//REs for validation

	validate_field : function ( field, re )
	{
		if(re === undefined)
			return true;
		return re.test(field.val());
	},

	val_event : function ( event )//onSubmit
	{
		$(this).find("input[type=text],textarea,select").each(function(index){
			if(!validate_field($(this),event.data.re[$(this).attr("id")]))
			{
				event.preventDefault();
				event.stopPropagation();
				$(this).addClass("invalid");
			}
			else
			{
				$(this).removeClass("invalid");
			}
		});
	},

	get_form_values : function ( form, formElems )
	//получает значения с полей формы и возвращает словарь
	{
		var temp, a={};
		for(var i in formElems)
		{
			$(form).find(formElems[i])
			.each(function(){
				if(a[$(this).attr('name')]===undefined)
				{
					a[$(this).attr('name')]=$(this).val();
				}
				else
				{
					a[$(this).attr('name')]+="+"+$(this).val();
				}
			});
		}
		return a;		
	},

	dict_to_hash : function ( dict )
	//преобразует словарь в GET запрос
	{	
		var a="#";
		return this.encode_request(dict,a);
	},

	hash_to_dict : function ()
	{
		var hash=location.hash.slice(1);
		return this.split_req(hash);
	},

	set_mult_checkboxes : function( obj )
	//sets groupped checkboxes by GET params
	{
		var get=this.GET_to_dict();
		var params=get[obj.attr("name")];
		if(params!==undefined)
		{
			params=params.split("+");
			obj.each(function(){
				for(var i=0;i<params.length;i++)
				{
					if($(this).attr("value")==params[i])
					{
						$(this).prop("checked",true);
					}
				}
			});
		}
	},

	encode_request : function ( dict, a )
	//makes encoded URI from the dict
	{
		for(var i in dict)
		{
			if(dict[i]!=""&&dict[i]!==undefined)
			{
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
			dict={};
		for(var i=0;i<req.length;i++)
		{
			temp=req[i].split("=");
			dict[temp[0]]=temp[1];
		}
		return dict;
	},

	GET_to_dict : function ()
	{
		var get=location.search.slice(1);
		return this.split_req(get);
	},

	set_obj_field : function ( obj, field, value, operation, prefix )
	{
		var f=obj;
		if(field!="")
			f=f.find(field);
		if(operation!="list"&&prefix!==undefined)
			value=prefix+value;
		if(operation=="text")
		{
			f.each(function(){$(this).text(value);});
		}
		else if(operation=="html")
		{
			f.each(function(){$(this).html(value);});
		}
		else if(operation=="class")
		{
			f.each(function(){$(this).addClass(value);});
		}
		else if(operation=="val")
		{
			f.each(function(){$(this).val(value);});
		}
		else if(operation=="list")
		{
			f.each(function(){
				for(var i=0;i<value.length;i++)
				{
					$(this).append($(prefix).html(value[i]));
				}
			});
		}
		else if(operation=="list_img")
		{
			f.each(function(){
				for(var i=0;i<value.length;i++)
				{
					$(this).append($("<img src='' alt=''/>").attr("src",value[i]));
				}
			});
		}
		else if(operation!==undefined && operation[0]=="_")
		{
			f.attr(operation.slice(1),value);
		}
		return obj;
	},

	fill_object : function ( obj, values )
	{
		var a;
		for(var i in values)
		{
			if(values[i]!==undefined)
				a=this.set_obj_field(obj,values[i]["field"],values[i]['value'],values[i]['operation'],values[i]['prefix']);
		}
		return a;
	},

	parse_data : function ( data, rls )//преобразует json в словарь значений
	//rls - соответствие между полем модели, идентификатором объекта DOM и операцией 
	{
		var temp,a=[];
		for(var i in data['fields'])
		{
			temp=[];
			for(var j in data['fields'][i])
			{
				
				if(rls[j]!==undefined)
					temp.push({field:rls[j][0],value:data['fields'][i][j],operation:rls[j][1],prefix:rls[j][2]});
			}
			a.push(temp);
		}
		return a;
	}
};

function LoadPageAJAX( template, rls, top_button, bottom_button, page ) 
{
	this.form_elems    = ["input[type=number]","input[type=text]","select","input:checkbox:checked"];
	//selectors used for collecting form values
	this.first_page    = page === undefined ? 1 : page;
	this.last_page     = this.first_page;    
	//current page
	this.has_next      = false;
	this.is_empty      = false;
	this.load_top      = top_button === undefined;
	//is loading of previous pages active 
	this.load_bottom   = bottom_button === undefined;
	//is loading of next pages active
	this.afterLoadAjax = new Event('afterLoadAjax');
	this.afterFilterAjax = new Event('afterFilterAjax');
	//when loading is ok
	this.top_button    = top_button;
	this.bottom_button = bottom_button;
	this.filter_button = null;
	//click on this buttons activates loading
	this.button_after_filter = false;
	//is button for activation of loading after filterin needed
	this.empty        = null;
	//block for show that page is empty
	this.validation   = {};
	//re of form fields that will be validated
	this.template     = template;
	this.rls          = rls;
	//template for object creating and rules how to fill that
	this.data_loading = false;
	this.data         = null;
	this.cont         = null;
	this.page_cont    = "<div class='obj_page' id='page_'><div>";
	this.scroll_event = null;

	//do it need getting page from GET and page changing on scrolling and loading??

 	this.load_next = function(){
		this.last_page++;
		this.load_objects(true);
	};

	this.load_prev = function(){
		this.first_page--;
		this.load_objects(false);
	};

	this.filter_objects = function(){
		this.empty.hide();
		this.first_page = 1;
		this.last_page  = 1;
		this.load_top   = false;
		this.load_bottom = false;
		$(document).one('afterFilterAjax',{ load_class: this },this.after_filter);
		this.load_objects(true,true);
	};

	this.set_data = function( forward ){
		var d = HelperFunctions.parse_data(this.data,this.rls)
		if( forward )
			var page_num = this.last_page;
		else
			var page_num = this.first_page;
		var page = $(this.page_cont).attr("id","page_"+page_num);
		for(var i in d)
		{
			page=page.append(HelperFunctions.fill_object($(this.template),d[i]));
		}
		if(forward)
			this.cont.append(page);
		else
			this.cont.prepend(page);
	};

	this.load_objects = function( forward, filter ){
		console.log("load objects");
		var kwargs = HelperFunctions.get_form_values(this.form,this.form_elems);
		if( forward )
			var page = this.last_page;
		else
			var page = this.first_page;
		kwargs['page']    = page;
		this.data_loading = true;
		this.data         = null;
		var loader        = this;
		$.getJSON(this.address,kwargs,function(data){
			if(filter)
				loader.cont.empty();
			loader.data_loading = false;
			loader.data         = data;
			if(!data['fields'].length)
				loader.is_empty = true;
			else
				loader.is_empty = false;
			if(forward)
				loader.has_next = data['has_next'];
			loader.set_data(forward);
			// history.pushState(null,null,location.pathname + HelperFunctions.dict_to_GET(kwargs));	
			if( filter )
				document.dispatchEvent(loader.afterFilterAjax);
			else
				document.dispatchEvent(loader.afterLoadAjax);
		});
	};

	this.top_button_click = function( event ){
		var load_class = event.data.load_class;
		load_class.top_button.hide();
		load_class.load_prev();
		if(load_class.scroll_event === null)
			$(document).on("scroll",{load_class:load_class},load_class.on_scroll);
		load_class.load_top = true;
	};

	this.bottom_button_click = function( event ){
		var load_class = event.data.load_class;
		load_class.bottom_button.hide();
		load_class.load_next();
		if(load_class.scroll_event === null)
			$(document).on("scroll",{load_class:load_class},load_class.on_scroll);
		load_class.load_bottom = true;
	};

	this.filter_button_click = function( event ){
		var load_class = event.data.load_class;
		$(document).off(load_class.scroll_event);
		load_class.bottom_button.hide();
		load_class.top_button.hide();
		load_class.load_bottom = false;
		load_class.load_top    = false;
		load_class.filter_objects();
	};

	this.after_load_more = function( event )//Действия после "загрузить еще"
	{
		console.log("after load more");
		var load_class = event.data.load_class;
		if(load_class.has_next || load_class.first_page > 1)
		{
			if(load_class.scroll_event === null)
				$(document).on("scroll",{load_class:load_class},load_class.on_scroll);
		}
	};

	this.after_filter = function( event )//Действия после фильтрации
	{
		console.log("after filter");
		var load_class = event.data.load_class;
		if(load_class.has_next)
		{
			if(load_class.button_after_filter)
				load_class.bottom_button.show();
			else
			{
				if(load_class.scroll_event === null)
					$(document).on("scroll",{load_class:load_class},load_class.on_scroll);
				load_class.load_bottom = true;
			}
		}
		if(load_class.is_empty)
		{
			load_class.empty.show();
		}
		else
		{
			load_class.empty.hide();
		}
	};

	this.on_scroll = function( event ){
		console.log("scroll");
		var load_class = event.data.load_class;
		var page_class = $(load_class.page_cont).attr("class");
		var pages = $("."+page_class);
		var last_idx=pages.last().offset(),
			first_idx=pages.first().offset();
		if( !load_class.data_loading )
		{

			if((first_idx===undefined
				|| $(document).scrollTop()<= first_idx.top)
				&& load_class.load_top && load_class.first_page > 1)
			{
				load_class.load_prev();	
				load_class.data_loading = true;	
			}

			if((last_idx===undefined
				|| $(document).scrollTop()+$(window).height() >= last_idx.top)
				&& load_class.load_bottom && load_class.has_next)
			{
				load_class.load_next();	
				load_class.data_loading = true;	 	
			}
		}
	};

	this.set_filter_button = function(filter_button){
		this.filter_button = filter_button;
		this.filter_button.on("click",{load_class:this},this.filter_button_click);
	}

	$(document).on('afterLoadAjax',{load_class:this},this.after_load_more);
	if(this.load_top || this.load_bottom)
		$(document).on("scroll",{load_class:this},this.on_scroll);
	if(!this.load_top)
		this.top_button.on('click',{load_class:this},this.top_button_click);
	if(!this.load_bottom)
		this.bottom_button.on("click",{load_class:this},this.bottom_button_click);	
}