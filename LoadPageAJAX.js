var HelperFunctions = {
	email_re	:  /^\w+@\w+\.[A-Za-z]+$/,
	phone_re	:  /^\+7\(\d{3}\)\d{3} \d{4}$/,
	anything	:  /.*/,
	anything_req:  /.+/,
	address_req :  /^\d{1,4}[\D\S]{0,2}$/,
	address     :  /^\d{0,4}[\D\S]{0,2}$/,
	//REs for validation

	validate_field : function (field,re)
	{
		if(re === undefined)
			return true;
		return re.test(field.val());
	},

	val_event : function (event)//onSubmit
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

	get_form_values : function (form,formElems)
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

	dict_to_hash : function (dict)
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

	set_mult_checkboxes : function(obj)
	//sets groupped checkboxes by GET params
	{
		var get=GET_to_dict();
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

	encode_request : function (dict,a)
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

	dict_to_GET : function (dict)
	//преобразует словарь в GET запрос
	{	
		var a="?";
		return this.encode_request(dict,a);
	},

	split_req : function (req)
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

	set_obj_field : function (obj,field,value,operation,prefix)
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
			f.each(function(){addClass(value);});
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
					$(this).append($("<img src='' alt=''/>").attr("href",value[i]));
				}
			});
		}
		else if(operation!==undefined&&operation[0]=="_")
		{
			f.attr(operation.slice(1),value);
		}
		return obj;
	},

	fill_object : function (obj,values)
	{
		var a;
		for(var i in values)
		{
			if(values[i]!==undefined)
				a=this.set_obj_field(obj,values[i]["field"],values[i]['value'],values[i]['operation'],values[i]['prefix']);
		}
		return a;
	},

	parse_data : function (data,rls)//преобразует json в словарь значений
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

function LoadPageAJAX(template,rls,top_button,bottom_button) 
{
	this.form_elems    = ["input[type=number]","input[type=text]","select","input:checkbox:checked"];
	//selectors used for collecting form values
	this.first_page    = 1;
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

 	this.load_next = function(){
		this.last_page++;
		this.load_objects(true);
	};

	this.load_prev = function(){
		this.first_page--;
		this.load_objects(false);
	};

	this.filter_objects = function(){
		this.cont.empty();
		this.first_page = 1;
		this.last_page  = 1;
		this.load_top   = false;
		this.load_bottom = false;
		document.addEventListener('afterFilterAjax',this.after_filter, false);
		this.load_objects(true,true);
	};

	this.set_data = function( forward ){
		var d = HelperFunctions.parse_data(this.data,this.rls)
		for(var i in d)
		{
			if( forward )
				page_num = this.last_page;
			else
				page_num = this.first_page;
			var page = $(this.page_cont).attr("id","page_"+page_num);
			page=page.append(HelperFunctions.fill_object($(this.template),d[i]));
			if(forward)
				this.cont.append(page);
			else
				this.cont.prepend(page);
		}
		delete kwargs.page;
	};

	this.load_objects = function( forward, filter ){
		var kwargs = HelperFunctions.get_form_values(this.form,this.form_elems);
		if( forward )
			page = this.last_page;
		else
			page = this.first_page;
		kwargs['page']    = page;
		this.data_loading = true;
		this.data         = null;
		$.getJSON(this.address,kwargs,function(data){
			this.data_loading = false;
			this.data         = data;
			if(!data['fields'].length)
				this.is_empty = true;
			else
				this.is_empty = false;
			this.has_next = data['has_next'];
			this.set_data(forward);
			history.pushState(null,null,location.pathname+dict_to_GET(kwargs));	
			if( filter )
				document.dispatchEvent(this.afterFilterAjax);
			else
				document.dispatchEvent(this.afterLoadAjax);
		});
	};

	this.top_button_click = function(event){
		this.top_button.hide();
		this.load_next();
		if(!this.load_bottom) 
			$("body").on("scroll",this.on_scroll);
		this.load_top = true;
	};

	this.bottom_button_click = function(event){
		this.bottom_button.hide();
		this.load_prev();
		if(!this.load_top) 
			$("body").on("scroll",this.on_scroll);
		this.load_bottom = true;
	};

	this.after_load_more = function(event)//Действия после "загрузить еще"
	{
		if(this.has_next || this.first_page > 0)
		{
			$("body").on("scroll",this.on_scroll);
		}
	}

	this.after_filter = function(event)//Действия после фильтрации
	{
		if(this.has_next)
		{
			if(this.button_after_filter)
				this.bottom_button.show();
			else
			{
				$("body").on("scroll",this.on_scroll);
				this.load_bottom = true;
			}
		}
		if(this.is_empty)
		{
			this.empty.show();
		}
	}

	this.on_scroll = function(event){
		var page_class = this.page_cont.attr("class");
		var pages = $("."+page_class);
		var last_idx=pages.last().offset(),
			first_idx=pages.first().offset();
		if(!this.data_loading)
		{
			if((first_idx===undefined
				|| $(document).scrollTop()+$(window).height() <= first_idx.top)
				&& this.load_top)
			{
				this.load_prev();		
			}

			if((last_idx===undefined
				|| $(document).scrollTop()+$(window).height() >= last_idx.top)
				&& this.load_bottom)
			{
				this.load_next();		
			}
		}
	};

	document.addEventListener('afterLoadAjax',this.after_load_more, false);
	if(this.load_top || this.load_bottom)
		$("body").on("scroll",this.on_scroll);
	if(!this.load_top)
		this.top_button.on('click',this.top_button_click);
	if(!this.load_bottom)
		this.bottom_button.on("click",this.bottom_button_click);
	$(this.filter_button).on("click",this.filter_objects);
}