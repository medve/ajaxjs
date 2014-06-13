var formElemsDef=["input[type=number]","input[type=text]","select","input:checkbox:checked"],
	page=1,
	has_next=false,
	is_empty=false,
	load_top=false,
	load_bottom=false;

var afterLoadAjax = new Event('afterLoadAjax');


function setObjField(obj,field,value,operation,prefix)
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
	else if(operation!==undefined&&operation[0]=="_")
	{
		f.attr(operation.slice(1),value);
	}
	return obj;
}

function fillObject(obj,values)
{
	var a;
	for(var i in values)
	{
		if(values[i]!==undefined)
			a=setObjField(obj,values[i]["field"],values[i]['value'],values[i]['operation'],values[i]['prefix']);
	}
	return a;
}

function getFormValues(form,formElems)//получает значения с полей формы и возвращает словарь
{
	var temp,a={};
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
}

function GETToDict()
{
	var get=location.search.slice(1);
	return split_req(get);
}

function hash_to_dict()
{
	var hash=location.hash.slice(1);
	return split_req(hash);
}

function split_req(req)
{
	req=req.split("&");
	var temp;
	dict={};
	for(var i=0;i<req.length;i++)
	{
		temp=req[i].split("=");
		dict[temp[0]]=temp[1];
	}
	return dict;
}

function dictToGET(dict)//преобразует словарь в GET запрос
{	
	var a="?";
	return make_req(dict,a);
}

function dictToHash(dict)//преобразует словарь в GET запрос
{	
	var a="#";
	return make_req(dict,a);
}

function make_req(dict,a)
{
	for(var i in dict)
	{
		if(dict[i]!=""&&dict[i]!==undefined)
		{
			a+=i+"="+dict[i]+"&";
		}
	}
	return encodeURI(a.slice(0,-1));
}

function parseData(data,rls)//преобразует json в словарь значений
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

function loadObjects()
{
	var kwargs=getFormValues(form,formElems);
	kwargs['page']=page;
	$.getJSON(address,kwargs,function(data){
		if(!data['fields'].length)
			is_empty=true;
		else
			is_empty=false;
		has_next=data['has_next'];
		var d =parseData(data,rls);
		for(var i in d)
		{
			cont.append(fillObject($(obj),d[i]));
		}
		delete kwargs.page;
		history.pushState(null,null,location.pathname+dictToGET(kwargs));
		elem.dispatchEvent(afterLoadAjax);
	});
}
//-----------------------------------------------------------------
function loadPrev()
{
	load_more_top_button.hide()
	page--;
	load_top=true;
	document.addEventListener('afterLoadAjax',afterLoadMoreAjax, false);
	loadObjects();
}


function loadNext()
{
	load_more_button.hide()
	page++;
	load_bottom=true;
	document.addEventListener('afterLoadAjax',afterLoadMoreAjax, false);
	loadObjects();
}

function filterObjects()
{
	load_more_button.hide();
	load_more_top_button.hide()
	$('#empty').hide();
	cont.empty();
	page=1;
	document.addEventListener('afterLoadAjax',afterFilterAjax, false);
	loadObjects();
}

function ajaxOnScroll()
{
	$(document).on('scroll',function(event){
		var last_idx=item_idx.last().offset(),
			first_idx=item_idx.first().offset();

		if((first_idx===undefined||$(document).scrollTop()+$(window).height() <= first_idx.top)&&load_top)
		{
			$(this).off(event);
			loadPrev();		
		}

		if(last_idx===undefined||$(document).scrollTop()+$(window).height() >= last_idx.top)&&load_bottom)
		{
			$(this).off(event);
			loadNext();		
		}
	});
}

function afterLoadMoreAjax()//Действия после "загрузить еще"
{
	if(has_next&&page>1)
	{
		ajaxOnScroll();
	}

}

function afterFilterAjax()//Действия после фильтрации
{
	if(has_next&&page>1)
	{
		load_more_button.show();
	}
	if(is_empty)
	{
		$('#empty').show();
	}
}

function set_mult_checkbox(obj)
{
	var get=GETToDict();
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
}
