"use strict";(self.webpackChunkattibling=self.webpackChunkattibling||[]).push([[571],{623:(t,e,n)=>{n.d(e,{dZ:()=>o,e:()=>s,eS:()=>r,ej:()=>l,p6:()=>i,tq:()=>a});var o=function(){var t=document.querySelector("html");return["ar","he","fa"].includes(t.getAttribute("lang"))},a=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"768px";return window.matchMedia("(max-width: ".concat(t,")")).matches},i=function(t){return t?new Date(t).toLocaleDateString(document.documentElement.lang,{year:"numeric",month:"long",day:"numeric"}):""},s=function(){for(var t=document.querySelectorAll(".kg-gallery-image img"),e=0,n=t.length;e<n;e++){var o=t[e].closest(".kg-gallery-image"),a=t[e].attributes.width.value/t[e].attributes.height.value;o.style.flex="".concat(a," 1 0%")}},r=function(t){t(".js-post-content").find("img").each((function(){t(this).closest("figure").hasClass("kg-bookmark-card")||t(this).closest("figure").hasClass("kg-nft-card")||t(this).parent().is("a")||t(this).hasClass("kg-product-card-image")||t(this).hasClass("kg-audio-thumbnail")||t(this).addClass("js-zoomable")}))},l=function(t,e){e(".js-zoomable").on("opened",(function(){setTimeout((function(){var e=t(".medium-zoom-image--opened");e.length>1&&e.last().hide()}),10)}))}},112:(t,e,n)=>{var o=n(677),a=n.n(o),i=n(98),s=n(936),r=n.n(s),l=n(498),c=n(369),u=(n(560),n(623)),d=null,m=null,h=window.scrollY,f=0,p=!1,g=function(){h=window.scrollY,y()},w=function(t){(0,u.tq)("1023px")?(a()("body").addClass("share-menu-displayed"),setTimeout((function(){d.removeAttr("data-animate")}),t)):a()("body").removeClass("share-menu-displayed")},v=function(){w(100),setTimeout((function(){b(),y()}),200)},y=function(){p||requestAnimationFrame(k),p=!0},k=function(){var t=a()(".js-post-content").height(),e=Math.ceil(h/t*100);e<=100&&j(e),p=!1},b=function(){var t=m.parent().width(),e=t/2,n=(0,u.tq)()?2:3;m.parent().attr("viewBox","0 0 ".concat(t," ").concat(t)),m.attr("stroke-width",n),m.attr("r",e-(n-1)),m.attr("cx",e),m.attr("cy",e),f=2*e*Math.PI,m[0].style.strokeDasharray="".concat(f," ").concat(f),m[0].style.strokeDashoffset=f},j=function(t){if(t<=100){var e=f-t/100*f;m[0].style.strokeDashoffset=e}};a()((function(){d=a()(".js-animation-wrapper");var t=a()(".js-scrolltop"),e=a()(".js-recommended-slider");if(r()(".js-post-content"),(0,u.e)(),w(1e3),e.length>0)new c.ZP(".js-recommended-slider",{modules:[c.W_,c.s5],navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"},slidesPerView:1,allowTouchMove:!0,loop:!0,a11y:!0,breakpoints:{720:{slidesPerView:2,allowTouchMove:!0,loop:!0},1024:{slidesPerView:3,allowTouchMove:!1,loop:!1}},on:{init:function(){(0,l.Z)(".js-article-card-title",100),(0,l.Z)(".js-article-card-title-no-image",250)}}});(0,l.Z)(".js-article-card-title",100),(0,l.Z)(".js-article-card-title-no-image",250),t.on("click",(function(){a()("html, body").animate({scrollTop:0},500)})),(0,u.eS)(a()),(0,u.ej)(a(),i.Z),window.addEventListener("scroll",g,{passive:!0}),window.addEventListener("resize",v,{passive:!0})})),a()(window).on("load",(function(){m=a()(".js-progress"),b(),k(),setTimeout((function(){m.parent().css("opacity",1)}),300)}))}},t=>{t.O(0,[898],(()=>{return e=112,t(t.s=e);var e}));t.O()}]);