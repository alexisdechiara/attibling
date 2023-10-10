"use strict";(self.webpackChunkattibling=self.webpackChunkattibling||[]).push([[773],{690:(e,t,n)=>{var o=n(677),s=n.n(o),a=n(618),i=n.n(a),l=n(296),c=(n(17),n(498)),r=n(232),d=n(570),u=n(369),m=(n(560),n(623));s()((function(){(0,m.dZ)()&&s()("html").attr("dir","rtl").addClass("rtl");var e=s()("body"),t=s()(".js-header"),n=s()(".js-open-menu"),o=s()(".js-close-menu"),a=s()(".js-menu"),h=s()(".js-toggle-submenu"),g=s()(".js-submenu-option")[0],f=s()(".js-submenu"),v=s()(".js-recent-slider"),p=s()(".js-open-secondary-menu"),w=s()(".js-open-search"),k=s()(".js-close-search"),b=s()(".js-search"),C=s()(".js-input-search"),y=s()(".js-search-results"),j=s()(".js-no-results"),S=s()(".js-switch-theme"),_=s()(".js-main-nav"),Z=s()(".js-main-nav-left"),I=s()(".js-newsletter"),M=s()(".js-native-comments > div > iframe")[0],x=window.matchMedia("(prefers-color-scheme: dark)"),L=null,T=!1,q=null,A=function(){t.removeClass("submenu-is-active"),h.removeClass("active"),f.removeClass("opened").addClass("closed")},E=function(){e.toggleClass("no-scroll-y")},z=function(e,t){var n=new r.Z({url:e,key:t,version:"v5.0"}),o=[],s={shouldSort:!0,ignoreLocation:!0,findAllMatches:!0,includeScore:!0,minMatchCharLength:2,keys:["title","custom_excerpt","tags.name"]};n.posts.browse({limit:"all",include:"tags",fields:"id, title, url, published_at, custom_excerpt"}).then((function(e){for(var t=0,n=e.length;t<n;t++)o.push(e[t]);L=new d.Z(o,s)})).catch((function(e){console.log(e)}))},H=function(e){(0,m.tq)()||(e?(_.addClass("toggle-overflow"),Z.addClass("toggle-overflow")):(_.removeClass("toggle-overflow"),Z.removeClass("toggle-overflow")))};n.on("click",(function(){t.addClass("mobile-menu-opened"),a.addClass("opened"),E()})),o.on("click",(function(){t.removeClass("mobile-menu-opened"),a.removeClass("opened"),E()})),h.on("click",(function(){(T=!T)?(t.addClass("submenu-is-active"),h.addClass("active"),f.removeClass("closed").addClass("opened"),t.removeClass("covered")):(A(),O())})),w.on("click",(function(){b.addClass("opened"),setTimeout((function(){C.trigger("focus")}),400),E()})),k.on("click",(function(){C.trigger("blur"),b.removeClass("opened"),E()})),C.on("keyup",(function(){if(C.val().length>0&&L){var e=L.search(C.val()).filter((function(e){if(e.score<=.5)return e})),t="";if(e.length>0){for(var n=0,o=e.length;n<o;n++)t+='\n          <article class="m-result">            <a href="'.concat(e[n].item.url,'" class="m-result__link">              <h3 class="m-result__title">').concat(e[n].item.title,'</h3>              <span class="m-result__date">').concat((0,m.p6)(e[n].item.published_at),"</span>            </a>          </article>");j.hide(),y.html(t),y.show()}else y.html(""),y.hide(),j.show()}else y.html(""),y.hide(),j.hide()})),S.on("click",(function(){"light"===localStorage.getItem("theme")?N():"dark"===localStorage.getItem("theme")?D():K(),M&&M.contentDocument.location.reload(!0)}));var P=function(){s()(".light-theme-icon").css("display","none"),s()(".dark-theme-icon").css("display","none"),s()(".auto-theme-icon").css("display","none")},D=function(){P(),s()("html").attr("data-theme","light"),localStorage.setItem("theme","light"),s()(".light-theme-icon").css("display","block")},K=function(){P(),s()("html").attr("data-theme","dark"),localStorage.setItem("theme","dark"),s()(".dark-theme-icon").css("display","block")},N=function(){window.matchMedia&&x.matches?s()("html").attr("data-theme","dark"):s()("html").attr("data-theme","light"),P(),localStorage.setItem("theme","auto"),s()(".auto-theme-icon").css("display","block")};x.addEventListener("change",(function(){N()})),S.on("mouseenter",(function(){H(!0)})),S.on("mouseleave",(function(){H(!1)})),s()(window).on("click",(function(e){T&&g&&!g.contains(e.target)&&(T=!1,A())})),s()(document).on("keyup",(function(e){"Escape"===e.key&&b.hasClass("opened")&&k.trigger("click")})),localStorage.getItem("theme")?"light"===localStorage.getItem("theme")?D():"dark"===localStorage.getItem("theme")?K():N():N(),s()(window).on("scroll",(function(){O()}));var O=function(){t.hasClass("with-picture")&&t.offset().top<t.height()?t.addClass("covered"):t.removeClass("covered")};t.length>0&&new(i())(t[0],{tolerance:{down:40,up:20},offset:15,onUnpin:function(){if(!(0,m.tq)()&&q){var e=q[0];e&&e.state.isVisible&&e.hide()}}}).init();if(v.length>0)new u.ZP(".js-recent-slider",{modules:[u.Rv,u.s5],freeMode:!0,slidesPerView:"auto",a11y:!0,on:{init:function(){(0,c.Z)(".js-recent-article-title",50)}}});if(p.length>0){var V=document.getElementById("secondary-navigation-template");q=(0,l.ZP)(".js-open-secondary-menu",{appendTo:document.body,content:V.innerHTML,allowHTML:!0,arrow:!0,trigger:"click",interactive:!0,onShow:function(){H(!0)},onHidden:function(){H(!1)}})}(0,l.ZP)(".js-tooltip"),(0,c.Z)(".js-article-card-title",100),(0,c.Z)(".js-article-card-title-no-image",250),"undefined"!=typeof disableNewsletter&&disableNewsletter&&I.remove(),"undefined"!=typeof ghostSearchApiKey&&"undefined"==typeof nativeSearchEnabled?z(ghostHost,ghostSearchApiKey):(w.css("visibility","hidden"),k.remove(),b.remove());var B=s()(".m-hero__picture"),R=0;function U(){if(B.length>=1){var e=s()(window).scrollTop();R=e>0?Math.floor(.5*e):0,B.css({"-webkit-transform":"translate3d(0, "+R+"px, 0)",transform:"translate3d(0, "+R+"px, 0)"})}}U(),s()(window).on({scroll:function(){U()},resize:function(){U()},orientationchange:function(){U()}})}))},623:(e,t,n)=>{n.d(t,{dZ:()=>o,e:()=>i,eS:()=>l,ej:()=>c,p6:()=>a,tq:()=>s});var o=function(){var e=document.querySelector("html");return["ar","he","fa"].includes(e.getAttribute("lang"))},s=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"768px";return window.matchMedia("(max-width: ".concat(e,")")).matches},a=function(e){return e?new Date(e).toLocaleDateString(document.documentElement.lang,{year:"numeric",month:"long",day:"numeric"}):""},i=function(){for(var e=document.querySelectorAll(".kg-gallery-image img"),t=0,n=e.length;t<n;t++){var o=e[t].closest(".kg-gallery-image"),s=e[t].attributes.width.value/e[t].attributes.height.value;o.style.flex="".concat(s," 1 0%")}},l=function(e){e(".js-post-content").find("img").each((function(){e(this).closest("figure").hasClass("kg-bookmark-card")||e(this).closest("figure").hasClass("kg-nft-card")||e(this).parent().is("a")||e(this).hasClass("kg-product-card-image")||e(this).hasClass("kg-audio-thumbnail")||e(this).addClass("js-zoomable")}))},c=function(e,t){t(".js-zoomable").on("opened",(function(){setTimeout((function(){var t=e(".medium-zoom-image--opened");t.length>1&&t.last().hide()}),10)}))}}},e=>{e.O(0,[898],(()=>{return t=690,e(e.s=t);var t}));e.O()}]);