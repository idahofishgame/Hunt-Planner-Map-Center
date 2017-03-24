/*!
 * Bootstrap-select v1.6.2 (http://silviomoreto.github.io/bootstrap-select/)
 *
 * Copyright 2013-2014 bootstrap-select
 * Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)
 */
(function ($) {
  'use strict';

  // Case insensitive search
  $.expr[':'].icontains = function (obj, index, meta) {
    return icontains($(obj).text(), meta[3]);
  };

  // Case and accent insensitive search
  $.expr[':'].aicontains = function (obj, index, meta) {
    return icontains($(obj).data('normalizedText') || $(obj).text(), meta[3]);
  };

  /**
   * Actual implementation of the case insensitive search.
   * @access private
   * @param {String} haystack
   * @param {String} needle
   * @returns {boolean}
   */
  function icontains(haystack, needle) {
    return haystack.toUpperCase().indexOf(needle.toUpperCase()) > -1;
  }

  /**
   * Remove all diatrics from the given text.
   * @access private
   * @param {String} text
   * @returns {String}
   */
  function normalizeToBase(text) {
    var rExps = [
      {re: /[\xC0-\xC6]/g, ch: "A"},
      {re: /[\xE0-\xE6]/g, ch: "a"},
      {re: /[\xC8-\xCB]/g, ch: "E"},
      {re: /[\xE8-\xEB]/g, ch: "e"},
      {re: /[\xCC-\xCF]/g, ch: "I"},
      {re: /[\xEC-\xEF]/g, ch: "i"},
      {re: /[\xD2-\xD6]/g, ch: "O"},
      {re: /[\xF2-\xF6]/g, ch: "o"},
      {re: /[\xD9-\xDC]/g, ch: "U"},
      {re: /[\xF9-\xFC]/g, ch: "u"},
      {re: /[\xC7-\xE7]/g, ch: "c"},
      {re: /[\xD1]/g, ch: "N"},
      {re: /[\xF1]/g, ch: "n"}
    ];
    $.each(rExps, function () {
      text = text.replace(this.re, this.ch);
    });
    return text;
  }

  var Selectpicker = function (element, options, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    this.$element = $(element);
    this.$newElement = null;
    this.$button = null;
    this.$menu = null;
    this.$lis = null;
    this.options = options;

    // If we have no title yet, try to pull it from the html title attribute (jQuery doesnt' pick it up as it's not a
    // data-attribute)
    if (this.options.title === null) {
      this.options.title = this.$element.attr('title');
    }

    //Expose public methods
    this.val = Selectpicker.prototype.val;
    this.render = Selectpicker.prototype.render;
    this.refresh = Selectpicker.prototype.refresh;
    this.setStyle = Selectpicker.prototype.setStyle;
    this.selectAll = Selectpicker.prototype.selectAll;
    this.deselectAll = Selectpicker.prototype.deselectAll;
    this.destroy = Selectpicker.prototype.remove;
    this.remove = Selectpicker.prototype.remove;
    this.show = Selectpicker.prototype.show;
    this.hide = Selectpicker.prototype.hide;

    this.init();
  };

  Selectpicker.VERSION = '1.6.2';

  // part of this is duplicated in i18n/defaults-en_US.js. Make sure to update both.
  Selectpicker.DEFAULTS = {
    noneSelectedText: 'Nothing selected',
    noneResultsText: 'No results match',
    countSelectedText: function (numSelected, numTotal) {
      return (numSelected == 1) ? "{0} item selected" : "{0} items selected";
    },
    maxOptionsText: function (numAll, numGroup) {
      var arr = [];

      arr[0] = (numAll == 1) ? 'Limit reached ({n} item max)' : 'Limit reached ({n} items max)';
      arr[1] = (numGroup == 1) ? 'Group limit reached ({n} item max)' : 'Group limit reached ({n} items max)';

      return arr;
    },
    selectAllText: 'Select All',
    deselectAllText: 'Deselect All',
    multipleSeparator: ', ',
    style: 'btn-default',
    size: 'auto',
    title: null,
    selectedTextFormat: 'values',
    width: false,
    container: false,
    hideDisabled: false,
    showSubtext: false,
    showIcon: true,
    showContent: true,
    dropupAuto: true,
    header: false,
    liveSearch: false,
    actionsBox: false,
    iconBase: 'glyphicon',
    tickIcon: 'glyphicon-ok',
    maxOptions: false,
    mobile: false,
    selectOnTab: false,
    dropdownAlignRight: false,
    searchAccentInsensitive: false
  };

  Selectpicker.prototype = {

    constructor: Selectpicker,

    init: function () {
      var that = this,
          id = this.$element.attr('id');

      this.$element.hide();
      this.multiple = this.$element.prop('multiple');
      this.autofocus = this.$element.prop('autofocus');
      this.$newElement = this.createView();
      this.$element.after(this.$newElement);
      this.$menu = this.$newElement.find('> .dropdown-menu');
      this.$button = this.$newElement.find('> button');
      this.$searchbox = this.$newElement.find('input');

      if (this.options.dropdownAlignRight)
        this.$menu.addClass('dropdown-menu-right');

      if (typeof id !== 'undefined') {
        this.$button.attr('data-id', id);
        $('label[for="' + id + '"]').click(function (e) {
          e.preventDefault();
          that.$button.focus();
        });
      }

      this.checkDisabled();
      this.clickListener();
      if (this.options.liveSearch) this.liveSearchListener();
      this.render();
      this.liHeight();
      this.setStyle();
      this.setWidth();
      if (this.options.container) this.selectPosition();
      this.$menu.data('this', this);
      this.$newElement.data('this', this);
      if (this.options.mobile) this.mobile();
    },

    createDropdown: function () {
      // Options
      // If we are multiple, then add the show-tick class by default
      var multiple = this.multiple ? ' show-tick' : '',
          inputGroup = this.$element.parent().hasClass('input-group') ? ' input-group-btn' : '',
          autofocus = this.autofocus ? ' autofocus' : '',
          btnSize = this.$element.parents().hasClass('form-group-lg') ? ' btn-lg' : (this.$element.parents().hasClass('form-group-sm') ? ' btn-sm' : '');
      // Elements
      var header = this.options.header ? '<div class="popover-title"><button type="button" class="close" aria-hidden="true">&times;</button>' + this.options.header + '</div>' : '';
      var searchbox = this.options.liveSearch ? '<div class="bs-searchbox"><input type="text" class="input-block-level form-control" autocomplete="off" /></div>' : '';
      var actionsbox = this.options.actionsBox ? '<div class="bs-actionsbox">' +
          '<div class="btn-group btn-block">' +
          '<button class="actions-btn bs-select-all btn btn-sm btn-default">' +
          this.options.selectAllText +
          '</button>' +
          '<button class="actions-btn bs-deselect-all btn btn-sm btn-default">' +
          this.options.deselectAllText +
          '</button>' +
          '</div>' +
          '</div>' : '';
      var drop =
          '<div class="btn-group bootstrap-select' + multiple + inputGroup + '">' +
              '<button type="button" class="btn dropdown-toggle selectpicker' + btnSize + '" data-toggle="dropdown"' + autofocus + '>' +
              '<span class="filter-option pull-left"></span>&nbsp;' +
              '<span class="caret"></span>' +
              '</button>' +
              '<div class="dropdown-menu open">' +
              header +
              searchbox +
              actionsbox +
              '<ul class="dropdown-menu inner selectpicker" role="menu">' +
              '</ul>' +
              '</div>' +
              '</div>';

      return $(drop);
    },

    createView: function () {
      var $drop = this.createDropdown();
      var $li = this.createLi();
      $drop.find('ul').append($li);
      return $drop;
    },

    reloadLi: function () {
      //Remove all children.
      this.destroyLi();
      //Re build
      var $li = this.createLi();
      this.$menu.find('ul').append($li);
    },

    destroyLi: function () {
      this.$menu.find('li').remove();
    },

    createLi: function () {
      var that = this,
          _li = [],
          optID = 0;

      // Helper functions
      /**
       * @param content
       * @param [index]
       * @param [classes]
       * @returns {string}
       */
      var generateLI = function (content, index, classes) {
        return '<li' +
            (typeof classes !== 'undefined' ? ' class="' + classes + '"' : '') +
            (typeof index !== 'undefined' | null === index ? ' data-original-index="' + index + '"' : '') +
            '>' + content + '</li>';
      };

      /**
       * @param text
       * @param [classes]
       * @param [inline]
       * @param [optgroup]
       * @returns {string}
       */
      var generateA = function (text, classes, inline, optgroup) {
        var normText = normalizeToBase($.trim($("<div/>").html(text).text()).replace(/\s\s+/g, ' '));
        return '<a tabindex="0"' +
            (typeof classes !== 'undefined' ? ' class="' + classes + '"' : '') +
            (typeof inline !== 'undefined' ? ' style="' + inline + '"' : '') +
            (typeof optgroup !== 'undefined' ? 'data-optgroup="' + optgroup + '"' : '') +
            ' data-normalized-text="' + normText + '"' +
            '>' + text +
            '<span class="' + that.options.iconBase + ' ' + that.options.tickIcon + ' icon-ok check-mark"></span>' +
            '</a>';
      };

      this.$element.find('option').each(function () {
        var $this = $(this);

        // Get the class and text for the option
        var optionClass = $this.attr('class') || '',
            inline = $this.attr('style'),
            text = $this.data('content') ? $this.data('content') : $this.html(),
            subtext = typeof $this.data('subtext') !== 'undefined' ? '<small class="muted text-muted">' + $this.data('subtext') + '</small>' : '',
            icon = typeof $this.data('icon') !== 'undefined' ? '<span class="' + that.options.iconBase + ' ' + $this.data('icon') + '"></span> ' : '',
            isDisabled = $this.is(':disabled') || $this.parent().is(':disabled'),
            index = $this[0].index;
        if (icon !== '' && isDisabled) {
          icon = '<span>' + icon + '</span>';
        }

        if (!$this.data('content')) {
          // Prepend any icon and append any subtext to the main text.
          text = icon + '<span class="text">' + text + subtext + '</span>';
        }

        if (that.options.hideDisabled && isDisabled) {
          return;
        }

        if ($this.parent().is('optgroup') && $this.data('divider') !== true) {
          if ($this.index() === 0) { // Is it the first option of the optgroup?
            optID += 1;

            // Get the opt group label
            var label = $this.parent().attr('label');
            var labelSubtext = typeof $this.parent().data('subtext') !== 'undefined' ? '<small class="muted text-muted">' + $this.parent().data('subtext') + '</small>' : '';
            var labelIcon = $this.parent().data('icon') ? '<span class="' + that.options.iconBase + ' ' + $this.parent().data('icon') + '"></span> ' : '';
            label = labelIcon + '<span class="text">' + label + labelSubtext + '</span>';

            if (index !== 0 && _li.length > 0) { // Is it NOT the first option of the select && are there elements in the dropdown?
              _li.push(generateLI('', null, 'divider'));
            }

            _li.push(generateLI(label, null, 'dropdown-header'));
          }

          _li.push(generateLI(generateA(text, 'opt ' + optionClass, inline, optID), index));
        } else if ($this.data('divider') === true) {
          _li.push(generateLI('', index, 'divider'));
        } else if ($this.data('hidden') === true) {
          _li.push(generateLI(generateA(text, optionClass, inline), index, 'hide is-hidden'));
        } else {
          _li.push(generateLI(generateA(text, optionClass, inline), index));
        }
      });

      //If we are not multiple, we don't have a selected item, and we don't have a title, select the first element so something is set in the button
      if (!this.multiple && this.$element.find('option:selected').length === 0 && !this.options.title) {
        this.$element.find('option').eq(0).prop('selected', true).attr('selected', 'selected');
      }

      return $(_li.join(''));
    },

    findLis: function () {
      if (this.$lis == null) this.$lis = this.$menu.find('li');
      return this.$lis;
    },

    /**
     * @param [updateLi] defaults to true
     */
    render: function (updateLi) {
      var that = this;

      //Update the LI to match the SELECT
      if (updateLi !== false) {
        this.$element.find('option').each(function (index) {
          that.setDisabled(index, $(this).is(':disabled') || $(this).parent().is(':disabled'));
          that.setSelected(index, $(this).is(':selected'));
        });
      }

      this.tabIndex();
      var notDisabled = this.options.hideDisabled ? ':not([disabled])' : '';
      var selectedItems = this.$element.find('option:selected' + notDisabled).map(function () {
        var $this = $(this);
        var icon = $this.data('icon') && that.options.showIcon ? '<i class="' + that.options.iconBase + ' ' + $this.data('icon') + '"></i> ' : '';
        var subtext;
        if (that.options.showSubtext && $this.attr('data-subtext') && !that.multiple) {
          subtext = ' <small class="muted text-muted">' + $this.data('subtext') + '</small>';
        } else {
          subtext = '';
        }
        if ($this.data('content') && that.options.showContent) {
          return $this.data('content');
        } else if (typeof $this.attr('title') !== 'undefined') {
          return $this.attr('title');
        } else {
          return icon + $this.html() + subtext;
        }
      }).toArray();

      //Fixes issue in IE10 occurring when no default option is selected and at least one option is disabled
      //Convert all the values into a comma delimited string
      var title = !this.multiple ? selectedItems[0] : selectedItems.join(this.options.multipleSeparator);

      //If this is multi select, and the selectText type is count, the show 1 of 2 selected etc..
      if (this.multiple && this.options.selectedTextFormat.indexOf('count') > -1) {
        var max = this.options.selectedTextFormat.split('>');
        if ((max.length > 1 && selectedItems.length > max[1]) || (max.length == 1 && selectedItems.length >= 2)) {
          notDisabled = this.options.hideDisabled ? ', [disabled]' : '';
          var totalCount = this.$element.find('option').not('[data-divider="true"], [data-hidden="true"]' + notDisabled).length,
              tr8nText = (typeof this.options.countSelectedText === 'function') ? this.options.countSelectedText(selectedItems.length, totalCount) : this.options.countSelectedText;
          title = tr8nText.replace('{0}', selectedItems.length.toString()).replace('{1}', totalCount.toString());
        }
      }

      this.options.title = this.$element.attr('title');

      if (this.options.selectedTextFormat == 'static') {
        title = this.options.title;
      }

      //If we dont have a title, then use the default, or if nothing is set at all, use the not selected text
      if (!title) {
        title = typeof this.options.title !== 'undefined' ? this.options.title : this.options.noneSelectedText;
      }

      this.$button.attr('title', $.trim($("<div/>").html(title).text()).replace(/\s\s+/g, ' '));
      this.$newElement.find('.filter-option').html(title);
    },

    /**
     * @param [style]
     * @param [status]
     */
    setStyle: function (style, status) {
      if (this.$element.attr('class')) {
        this.$newElement.addClass(this.$element.attr('class').replace(/selectpicker|mobile-device|validate\[.*\]/gi, ''));
      }

      var buttonClass = style ? style : this.options.style;

      if (status == 'add') {
        this.$button.addClass(buttonClass);
      } else if (status == 'remove') {
        this.$button.removeClass(buttonClass);
      } else {
        this.$button.removeClass(this.options.style);
        this.$button.addClass(buttonClass);
      }
    },

    liHeight: function () {
      if (this.options.size === false) return;

      var $selectClone = this.$menu.parent().clone().find('> .dropdown-toggle').prop('autofocus', false).end().appendTo('body'),
          $menuClone = $selectClone.addClass('open').find('> .dropdown-menu'),
          liHeight = $menuClone.find('li').not('.divider').not('.dropdown-header').filter(':visible').children('a').outerHeight(),
          headerHeight = this.options.header ? $menuClone.find('.popover-title').outerHeight() : 0,
          searchHeight = this.options.liveSearch ? $menuClone.find('.bs-searchbox').outerHeight() : 0,
          actionsHeight = this.options.actionsBox ? $menuClone.find('.bs-actionsbox').outerHeight() : 0;

      $selectClone.remove();

      this.$newElement
          .data('liHeight', liHeight)
          .data('headerHeight', headerHeight)
          .data('searchHeight', searchHeight)
          .data('actionsHeight', actionsHeight);
    },

    setSize: function () {
      this.findLis();
      var that = this,
          menu = this.$menu,
          menuInner = menu.find('.inner'),
          selectHeight = this.$newElement.outerHeight(),
          liHeight = this.$newElement.data('liHeight'),
          headerHeight = this.$newElement.data('headerHeight'),
          searchHeight = this.$newElement.data('searchHeight'),
          actionsHeight = this.$newElement.data('actionsHeight'),
          divHeight = this.$lis.filter('.divider').outerHeight(true),
          menuPadding = parseInt(menu.css('padding-top')) +
              parseInt(menu.css('padding-bottom')) +
              parseInt(menu.css('border-top-width')) +
              parseInt(menu.css('border-bottom-width')),
          notDisabled = this.options.hideDisabled ? ', .disabled' : '',
          $window = $(window),
          menuExtras = menuPadding + parseInt(menu.css('margin-top')) + parseInt(menu.css('margin-bottom')) + 2,
          menuHeight,
          selectOffsetTop,
          selectOffsetBot,
          posVert = function () {
            // JQuery defines a scrollTop function, but in pure JS it's a property
            //noinspection JSValidateTypes
            selectOffsetTop = that.$newElement.offset().top - $window.scrollTop();
            selectOffsetBot = $window.height() - selectOffsetTop - selectHeight;
          };
      posVert();
      if (this.options.header) menu.css('padding-top', 0);

      if (this.options.size == 'auto') {
        var getSize = function () {
          var minHeight,
              lisVis = that.$lis.not('.hide');

          posVert();
          menuHeight = selectOffsetBot - menuExtras;

          if (that.options.dropupAuto) {
            that.$newElement.toggleClass('dropup', (selectOffsetTop > selectOffsetBot) && ((menuHeight - menuExtras) < menu.height()));
          }
          if (that.$newElement.hasClass('dropup')) {
            menuHeight = selectOffsetTop - menuExtras;
          }

          if ((lisVis.length + lisVis.filter('.dropdown-header').length) > 3) {
            minHeight = liHeight * 3 + menuExtras - 2;
          } else {
            minHeight = 0;
          }

          menu.css({'max-height': menuHeight + 'px', 'overflow': 'hidden', 'min-height': minHeight + headerHeight + searchHeight + actionsHeight + 'px'});
          menuInner.css({'max-height': menuHeight - headerHeight - searchHeight - actionsHeight - menuPadding + 'px', 'overflow-y': 'auto', 'min-height': Math.max(minHeight - menuPadding, 0) + 'px'});
        };
        getSize();
        this.$searchbox.off('input.getSize propertychange.getSize').on('input.getSize propertychange.getSize', getSize);
        $(window).off('resize.getSize').on('resize.getSize', getSize);
        $(window).off('scroll.getSize').on('scroll.getSize', getSize);
      } else if (this.options.size && this.options.size != 'auto' && menu.find('li' + notDisabled).length > this.options.size) {
        var optIndex = this.$lis.not('.divider' + notDisabled).find(' > *').slice(0, this.options.size).last().parent().index();
        var divLength = this.$lis.slice(0, optIndex + 1).filter('.divider').length;
        menuHeight = liHeight * this.options.size + divLength * divHeight + menuPadding;
        if (that.options.dropupAuto) {
          //noinspection JSUnusedAssignment
          this.$newElement.toggleClass('dropup', (selectOffsetTop > selectOffsetBot) && (menuHeight < menu.height()));
        }
        menu.css({'max-height': menuHeight + headerHeight + searchHeight + actionsHeight + 'px', 'overflow': 'hidden'});
        menuInner.css({'max-height': menuHeight - menuPadding + 'px', 'overflow-y': 'auto'});
      }
    },

    setWidth: function () {
      if (this.options.width == 'auto') {
        this.$menu.css('min-width', '0');

        // Get correct width if element hidden
        var selectClone = this.$newElement.clone().appendTo('body');
        var ulWidth = selectClone.find('> .dropdown-menu').css('width');
        var btnWidth = selectClone.css('width', 'auto').find('> button').css('width');
        selectClone.remove();

        // Set width to whatever's larger, button title or longest option
        this.$newElement.css('width', Math.max(parseInt(ulWidth), parseInt(btnWidth)) + 'px');
      } else if (this.options.width == 'fit') {
        // Remove inline min-width so width can be changed from 'auto'
        this.$menu.css('min-width', '');
        this.$newElement.css('width', '').addClass('fit-width');
      } else if (this.options.width) {
        // Remove inline min-width so width can be changed from 'auto'
        this.$menu.css('min-width', '');
        this.$newElement.css('width', this.options.width);
      } else {
        // Remove inline min-width/width so width can be changed
        this.$menu.css('min-width', '');
        this.$newElement.css('width', '');
      }
      // Remove fit-width class if width is changed programmatically
      if (this.$newElement.hasClass('fit-width') && this.options.width !== 'fit') {
        this.$newElement.removeClass('fit-width');
      }
    },

    selectPosition: function () {
      var that = this,
          drop = '<div />',
          $drop = $(drop),
          pos,
          actualHeight,
          getPlacement = function ($element) {
            $drop.addClass($element.attr('class').replace(/form-control/gi, '')).toggleClass('dropup', $element.hasClass('dropup'));
            pos = $element.offset();
            actualHeight = $element.hasClass('dropup') ? 0 : $element[0].offsetHeight;
            $drop.css({'top': pos.top + actualHeight, 'left': pos.left, 'width': $element[0].offsetWidth, 'position': 'absolute'});
          };
      this.$newElement.on('click', function () {
        if (that.isDisabled()) {
          return;
        }
        getPlacement($(this));
        $drop.appendTo(that.options.container);
        $drop.toggleClass('open', !$(this).hasClass('open'));
        $drop.append(that.$menu);
      });
      $(window).resize(function () {
        getPlacement(that.$newElement);
      });
      $(window).on('scroll', function () {
        getPlacement(that.$newElement);
      });
      $('html').on('click', function (e) {
        if ($(e.target).closest(that.$newElement).length < 1) {
          $drop.removeClass('open');
        }
      });
    },

    setSelected: function (index, selected) {
      this.findLis();
      this.$lis.filter('[data-original-index="' + index + '"]').toggleClass('selected', selected);
    },

    setDisabled: function (index, disabled) {
      this.findLis();
      if (disabled) {
        this.$lis.filter('[data-original-index="' + index + '"]').addClass('disabled').find('a').attr('href', '#').attr('tabindex', -1);
      } else {
        this.$lis.filter('[data-original-index="' + index + '"]').removeClass('disabled').find('a').removeAttr('href').attr('tabindex', 0);
      }
    },

    isDisabled: function () {
      return this.$element.is(':disabled');
    },

    checkDisabled: function () {
      var that = this;

      if (this.isDisabled()) {
        this.$button.addClass('disabled').attr('tabindex', -1);
      } else {
        if (this.$button.hasClass('disabled')) {
          this.$button.removeClass('disabled');
        }

        if (this.$button.attr('tabindex') == -1) {
          if (!this.$element.data('tabindex')) this.$button.removeAttr('tabindex');
        }
      }

      this.$button.click(function () {
        return !that.isDisabled();
      });
    },

    tabIndex: function () {
      if (this.$element.is('[tabindex]')) {
        this.$element.data('tabindex', this.$element.attr('tabindex'));
        this.$button.attr('tabindex', this.$element.data('tabindex'));
      }
    },

    clickListener: function () {
      var that = this;

      this.$newElement.on('touchstart.dropdown', '.dropdown-menu', function (e) {
        e.stopPropagation();
      });

      this.$newElement.on('click', function () {
        that.setSize();
        if (!that.options.liveSearch && !that.multiple) {
          setTimeout(function () {
            that.$menu.find('.selected a').focus();
          }, 10);
        }
      });

      this.$menu.on('click', 'li a', function (e) {
        var $this = $(this),
            clickedIndex = $this.parent().data('originalIndex'),
            prevValue = that.$element.val(),
            prevIndex = that.$element.prop('selectedIndex');

        // Don't close on multi choice menu
        if (that.multiple) {
          e.stopPropagation();
        }

        e.preventDefault();

        //Don't run if we have been disabled
        if (!that.isDisabled() && !$this.parent().hasClass('disabled')) {
          var $options = that.$element.find('option'),
              $option = $options.eq(clickedIndex),
              state = $option.prop('selected'),
              $optgroup = $option.parent('optgroup'),
              maxOptions = that.options.maxOptions,
              maxOptionsGrp = $optgroup.data('maxOptions') || false;

          if (!that.multiple) { // Deselect all others if not multi select box
            $options.prop('selected', false);
            $option.prop('selected', true);
            that.$menu.find('.selected').removeClass('selected');
            that.setSelected(clickedIndex, true);
          } else { // Toggle the one we have chosen if we are multi select.
            $option.prop('selected', !state);
            that.setSelected(clickedIndex, !state);
            $this.blur();

            if ((maxOptions !== false) || (maxOptionsGrp !== false)) {
              var maxReached = maxOptions < $options.filter(':selected').length,
                  maxReachedGrp = maxOptionsGrp < $optgroup.find('option:selected').length;

              if ((maxOptions && maxReached) || (maxOptionsGrp && maxReachedGrp)) {
                if (maxOptions && maxOptions == 1) {
                  $options.prop('selected', false);
                  $option.prop('selected', true);
                  that.$menu.find('.selected').removeClass('selected');
                  that.setSelected(clickedIndex, true);
                } else if (maxOptionsGrp && maxOptionsGrp == 1) {
                  $optgroup.find('option:selected').prop('selected', false);
                  $option.prop('selected', true);
                  var optgroupID = $this.data('optgroup');

                  that.$menu.find('.selected').has('a[data-optgroup="' + optgroupID + '"]').removeClass('selected');

                  that.setSelected(clickedIndex, true);
                } else {
                  var maxOptionsArr = (typeof that.options.maxOptionsText === 'function') ?
                          that.options.maxOptionsText(maxOptions, maxOptionsGrp) : that.options.maxOptionsText,
                      maxTxt = maxOptionsArr[0].replace('{n}', maxOptions),
                      maxTxtGrp = maxOptionsArr[1].replace('{n}', maxOptionsGrp),
                      $notify = $('<div class="notify"></div>');
                  // If {var} is set in array, replace it
                  /** @deprecated */
                  if (maxOptionsArr[2]) {
                    maxTxt = maxTxt.replace('{var}', maxOptionsArr[2][maxOptions > 1 ? 0 : 1]);
                    maxTxtGrp = maxTxtGrp.replace('{var}', maxOptionsArr[2][maxOptionsGrp > 1 ? 0 : 1]);
                  }

                  $option.prop('selected', false);

                  that.$menu.append($notify);

                  if (maxOptions && maxReached) {
                    $notify.append($('<div>' + maxTxt + '</div>'));
                    that.$element.trigger('maxReached.bs.select');
                  }

                  if (maxOptionsGrp && maxReachedGrp) {
                    $notify.append($('<div>' + maxTxtGrp + '</div>'));
                    that.$element.trigger('maxReachedGrp.bs.select');
                  }

                  setTimeout(function () {
                    that.setSelected(clickedIndex, false);
                  }, 10);

                  $notify.delay(750).fadeOut(300, function () {
                    $(this).remove();
                  });
                }
              }
            }
          }

          if (!that.multiple) {
            that.$button.focus();
          } else if (that.options.liveSearch) {
            that.$searchbox.focus();
          }

          // Trigger select 'change'
          if ((prevValue != that.$element.val() && that.multiple) || (prevIndex != that.$element.prop('selectedIndex') && !that.multiple)) {
            that.$element.change();
          }
        }
      });

      this.$menu.on('click', 'li.disabled a, .popover-title, .popover-title :not(.close)', function (e) {
        if (e.target == this) {
          e.preventDefault();
          e.stopPropagation();
          if (!that.options.liveSearch) {
            that.$button.focus();
          } else {
            that.$searchbox.focus();
          }
        }
      });

      this.$menu.on('click', 'li.divider, li.dropdown-header', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!that.options.liveSearch) {
          that.$button.focus();
        } else {
          that.$searchbox.focus();
        }
      });

      this.$menu.on('click', '.popover-title .close', function () {
        that.$button.focus();
      });

      this.$searchbox.on('click', function (e) {
        e.stopPropagation();
      });


      this.$menu.on('click', '.actions-btn', function (e) {
        if (that.options.liveSearch) {
          that.$searchbox.focus();
        } else {
          that.$button.focus();
        }

        e.preventDefault();
        e.stopPropagation();

        if ($(this).is('.bs-select-all')) {
          that.selectAll();
        } else {
          that.deselectAll();
        }
        that.$element.change();
      });

      this.$element.change(function () {
        that.render(false);
      });
    },

    liveSearchListener: function () {
      var that = this,
          no_results = $('<li class="no-results"></li>');

      this.$newElement.on('click.dropdown.data-api', function () {
        that.$menu.find('.active').removeClass('active');
        if (!!that.$searchbox.val()) {
          that.$searchbox.val('');
          that.$lis.not('.is-hidden').removeClass('hide');
          if (!!no_results.parent().length) no_results.remove();
        }
        if (!that.multiple) that.$menu.find('.selected').addClass('active');
        setTimeout(function () {
          that.$searchbox.focus();
        }, 10);
      });

      this.$searchbox.on('input propertychange', function () {
        if (that.$searchbox.val()) {

          if (that.options.searchAccentInsensitive) {
            that.$lis.not('.is-hidden').removeClass('hide').find('a').not(':aicontains(' + normalizeToBase(that.$searchbox.val()) + ')').parent().addClass('hide');
          } else {
            that.$lis.not('.is-hidden').removeClass('hide').find('a').not(':icontains(' + that.$searchbox.val() + ')').parent().addClass('hide');
          }

          if (!that.$menu.find('li').filter(':visible:not(.no-results)').length) {
            if (!!no_results.parent().length) no_results.remove();
            no_results.html(that.options.noneResultsText + ' "' + that.$searchbox.val() + '"').show();
            that.$menu.find('li').last().after(no_results);
          } else if (!!no_results.parent().length) {
            no_results.remove();
          }

        } else {
          that.$lis.not('.is-hidden').removeClass('hide');
          if (!!no_results.parent().length) no_results.remove();
        }

        that.$menu.find('li.active').removeClass('active');
        that.$menu.find('li').filter(':visible:not(.divider)').eq(0).addClass('active').find('a').focus();
        $(this).focus();
      });

      this.$menu.on('mouseenter', 'a', function (e) {
        that.$menu.find('.active').removeClass('active');
        $(e.currentTarget).parent().not('.disabled').addClass('active');
      });

      this.$menu.on('mouseleave', 'a', function () {
        that.$menu.find('.active').removeClass('active');
      });
    },

    val: function (value) {
      if (typeof value !== 'undefined') {
        this.$element.val(value);
        this.render();

        return this.$element;
      } else {
        return this.$element.val();
      }
    },

    selectAll: function () {
      this.findLis();
      this.$lis.not('.divider').not('.disabled').not('.selected').filter(':visible').find('a').click();
    },

    deselectAll: function () {
      this.findLis();
      this.$lis.not('.divider').not('.disabled').filter('.selected').filter(':visible').find('a').click();
    },

    keydown: function (e) {
      var $this,
          $items,
          $parent,
          index,
          next,
          first,
          last,
          prev,
          nextPrev,
          that,
          prevIndex,
          isActive,
          keyCodeMap = {
            32: ' ', 48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9', 59: ';',
            65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j', 75: 'k', 76: 'l',
            77: 'm', 78: 'n', 79: 'o', 80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u', 86: 'v', 87: 'w', 88: 'x',
            89: 'y', 90: 'z', 96: '0', 97: '1', 98: '2', 99: '3', 100: '4', 101: '5', 102: '6', 103: '7', 104: '8', 105: '9'
          };

      $this = $(this);

      $parent = $this.parent();

      if ($this.is('input')) $parent = $this.parent().parent();

      that = $parent.data('this');

      if (that.options.liveSearch) $parent = $this.parent().parent();

      if (that.options.container) $parent = that.$menu;

      $items = $('[role=menu] li a', $parent);

      isActive = that.$menu.parent().hasClass('open');

      if (!isActive && /([0-9]|[A-z])/.test(String.fromCharCode(e.keyCode))) {
        if (!that.options.container) {
          that.setSize();
          that.$menu.parent().addClass('open');
          isActive = true;
        } else {
          that.$newElement.trigger('click');
        }
        that.$searchbox.focus();
      }

      if (that.options.liveSearch) {
        if (/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && that.$menu.find('.active').length === 0) {
          e.preventDefault();
          that.$menu.parent().removeClass('open');
          that.$button.focus();
        }
        $items = $('[role=menu] li:not(.divider):not(.dropdown-header):visible', $parent);
        if (!$this.val() && !/(38|40)/.test(e.keyCode.toString(10))) {
          if ($items.filter('.active').length === 0) {
            if (that.options.searchAccentInsensitive) {
              $items = that.$newElement.find('li').filter(':aicontains(' + normalizeToBase(keyCodeMap[e.keyCode]) + ')');
            } else {
              $items = that.$newElement.find('li').filter(':icontains(' + keyCodeMap[e.keyCode] + ')');
            }
          }
        }
      }

      if (!$items.length) return;

      if (/(38|40)/.test(e.keyCode.toString(10))) {
        index = $items.index($items.filter(':focus'));
        first = $items.parent(':not(.disabled):visible').first().index();
        last = $items.parent(':not(.disabled):visible').last().index();
        next = $items.eq(index).parent().nextAll(':not(.disabled):visible').eq(0).index();
        prev = $items.eq(index).parent().prevAll(':not(.disabled):visible').eq(0).index();
        nextPrev = $items.eq(next).parent().prevAll(':not(.disabled):visible').eq(0).index();

        if (that.options.liveSearch) {
          $items.each(function (i) {
            if ($(this).is(':not(.disabled)')) {
              $(this).data('index', i);
            }
          });
          index = $items.index($items.filter('.active'));
          first = $items.filter(':not(.disabled):visible').first().data('index');
          last = $items.filter(':not(.disabled):visible').last().data('index');
          next = $items.eq(index).nextAll(':not(.disabled):visible').eq(0).data('index');
          prev = $items.eq(index).prevAll(':not(.disabled):visible').eq(0).data('index');
          nextPrev = $items.eq(next).prevAll(':not(.disabled):visible').eq(0).data('index');
        }

        prevIndex = $this.data('prevIndex');

        if (e.keyCode == 38) {
          if (that.options.liveSearch) index -= 1;
          if (index != nextPrev && index > prev) index = prev;
          if (index < first) index = first;
          if (index == prevIndex) index = last;
        }

        if (e.keyCode == 40) {
          if (that.options.liveSearch) index += 1;
          if (index == -1) index = 0;
          if (index != nextPrev && index < next) index = next;
          if (index > last) index = last;
          if (index == prevIndex) index = first;
        }

        $this.data('prevIndex', index);

        if (!that.options.liveSearch) {
          $items.eq(index).focus();
        } else {
          e.preventDefault();
          if (!$this.is('.dropdown-toggle')) {
            $items.removeClass('active');
            $items.eq(index).addClass('active').find('a').focus();
            $this.focus();
          }
        }

      } else if (!$this.is('input')) {
        var keyIndex = [],
            count,
            prevKey;

        $items.each(function () {
          if ($(this).parent().is(':not(.disabled)')) {
            if ($.trim($(this).text().toLowerCase()).substring(0, 1) == keyCodeMap[e.keyCode]) {
              keyIndex.push($(this).parent().index());
            }
          }
        });

        count = $(document).data('keycount');
        count++;
        $(document).data('keycount', count);

        prevKey = $.trim($(':focus').text().toLowerCase()).substring(0, 1);

        if (prevKey != keyCodeMap[e.keyCode]) {
          count = 1;
          $(document).data('keycount', count);
        } else if (count >= keyIndex.length) {
          $(document).data('keycount', 0);
          if (count > keyIndex.length) count = 1;
        }

        $items.eq(keyIndex[count - 1]).focus();
      }

      // Select focused option if "Enter", "Spacebar" or "Tab" (when selectOnTab is true) are pressed inside the menu.
      if ((/(13|32)/.test(e.keyCode.toString(10)) || (/(^9$)/.test(e.keyCode.toString(10)) && that.options.selectOnTab)) && isActive) {
        if (!/(32)/.test(e.keyCode.toString(10))) e.preventDefault();
        if (!that.options.liveSearch) {
          $(':focus').click();
        } else if (!/(32)/.test(e.keyCode.toString(10))) {
          that.$menu.find('.active a').click();
          $this.focus();
        }
        $(document).data('keycount', 0);
      }

      if ((/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && (that.multiple || that.options.liveSearch)) || (/(27)/.test(e.keyCode.toString(10)) && !isActive)) {
        that.$menu.parent().removeClass('open');
        that.$button.focus();
      }
    },

    mobile: function () {
      this.$element.addClass('mobile-device').appendTo(this.$newElement);
      if (this.options.container) this.$menu.hide();
    },

    refresh: function () {
      this.$lis = null;
      this.reloadLi();
      this.render();
      this.setWidth();
      this.setStyle();
      this.checkDisabled();
      this.liHeight();
    },

    update: function () {
      this.reloadLi();
      this.setWidth();
      this.setStyle();
      this.checkDisabled();
      this.liHeight();
    },

    hide: function () {
      this.$newElement.hide();
    },

    show: function () {
      this.$newElement.show();
    },

    remove: function () {
      this.$newElement.remove();
      this.$element.remove();
    }
  };

  // SELECTPICKER PLUGIN DEFINITION
  // ==============================
  function Plugin(option, event) {
    // get the args of the outer function..
    var args = arguments;
    // The arguments of the function are explicitly re-defined from the argument list, because the shift causes them
    // to get lost
    //noinspection JSDuplicatedDeclaration
    var option = args[0],
        event = args[1];
    [].shift.apply(args);
    var value;
    var chain = this.each(function () {
      var $this = $(this);
      if ($this.is('select')) {
        var data = $this.data('selectpicker'),
            options = typeof option == 'object' && option;

        if (!data) {
          var config = $.extend({}, Selectpicker.DEFAULTS, $.fn.selectpicker.defaults, $this.data(), options);
          $this.data('selectpicker', (data = new Selectpicker(this, config, event)));
        } else if (options) {
          for (var i in options) {
            if (options.hasOwnProperty(i)) {
              data.options[i] = options[i];
            }
          }
        }

        if (typeof option == 'string') {
          if (data[option] instanceof Function) {
            value = data[option].apply(data, args);
          } else {
            value = data.options[option];
          }
        }
      }
    });

    if (typeof value !== 'undefined') {
      //noinspection JSUnusedAssignment
      return value;
    } else {
      return chain;
    }
  }

  var old = $.fn.selectpicker;
  $.fn.selectpicker = Plugin;
  $.fn.selectpicker.Constructor = Selectpicker;

  // SELECTPICKER NO CONFLICT
  // ========================
  $.fn.selectpicker.noConflict = function () {
    $.fn.selectpicker = old;
    return this;
  };

  $(document)
      .data('keycount', 0)
      .on('keydown', '.bootstrap-select [data-toggle=dropdown], .bootstrap-select [role=menu], .bs-searchbox input', Selectpicker.prototype.keydown)
      .on('focusin.modal', '.bootstrap-select [data-toggle=dropdown], .bootstrap-select [role=menu], .bs-searchbox input', function (e) {
        e.stopPropagation();
      });

  // SELECTPICKER DATA-API
  // =====================
  $(window).on('load.bs.select.data-api', function () {
    $('.selectpicker').each(function () {
      var $selectpicker = $(this);
      Plugin.call($selectpicker, $selectpicker.data());
    })
  });
})(jQuery);

require([
	"esri/config",
	"esri/urlUtils",
	"esri/map",
	"esri/dijit/LocateButton",
	"esri/dijit/Scalebar",
	"esri/request",
	"esri/geometry/scaleUtils",
	"esri/layers/FeatureLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/PictureMarkerSymbol",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/TextSymbol",
	"esri/symbols/Font",
	"esri/Color",
	"esri/geometry/Point",
	"esri/geometry/Multipoint", 
	"esri/arcgis/utils",
	"esri/geometry/webMercatorUtils",
	"esri/layers/GraphicsLayer",
	"esri/dijit/LayerList",
	"esri/dijit/BasemapLayer",
	"esri/dijit/Basemap",
	"esri/dijit/BasemapGallery",
	"agsjs/layers/GoogleMapsLayer",
	"esri/dijit/Popup",
	"esri/InfoTemplate",
	"esri/dijit/PopupTemplate",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/WMSLayer",
	"esri/tasks/QueryTask",
	"esri/tasks/query",
	"esri/dijit/Search",
	"esri/geometry/Extent",
	"esri/tasks/GeometryService",
	"esri/dijit/Measurement",
	"esri/toolbars/draw",
	"esri/graphic",
	"esri/tasks/PrintParameters",
	"esri/tasks/PrintTemplate",
	"esri/tasks/PrintTask",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/json",
	"dojo/on",
	"dojo/parser",
	"dojo/query",
	"dojo/sniff",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dijit/registry",
	"dojo/domReady!"
],
	function (
	esriConfig, urlUtils, Map, LocateButton, Scalebar, request, scaleUtils, FeatureLayer, SimpleRenderer, PictureMarkerSymbol, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, TextSymbol, Font, Color, Point, Multipoint, arcgisUtils, webMercatorUtils, GraphicsLayer, LayerList, BasemapLayer, Basemap, BasemapGallery, GoogleMapsLayer, Popup, InfoTemplate, PopupTemplate, ArcGISDynamicMapServiceLayer, WMSLayer, QueryTask, Query, Search, Extent, GeometryService, Measurement, Draw, Graphic, PrintParameters, PrintTemplate, PrintTask, dom, domClass, domConstruct, JSON, on, parser, query, sniff, connect, arrayUtils, lang, registry
) {
		//Proxy settings
 		esriConfig.defaults.io.proxyUrl = "https://fishandgame.idaho.gov/ifwis/gis_proxy/proxy.ashx?";
		esriConfig.defaults.io.alwaysUseProxy = false;
		esriConfig.defaults.io.corsDetection = false;
		/*
		 urlUtils.addProxyRule({
		 urlPrefix: "http://wildfire.cr.usgs.gov/",
		 proxyUrl: "https://fishandgame.idaho.gov/ifwis/gis_proxy/proxy.ashx"
		 });*/

		// call the parser to create the dijit layout dijits
		parser.parse(); // note djConfig.parseOnLoad = false;

		//hide the loading icon after the window has loaded.
		$(window).load(function () {
				$("#loading").hide();
				clearFileInputField(uploadForm);
		});

		setTimeout(function(){
				$("#loading").hide();
		}, 5000);

		//create a popup div
		var popup = new Popup({
				titleInBody: false
		}, domConstruct.create("div"));

		//Get a reference to the ArcGIS Map class
		map = Map("mapDiv", {
				basemap: "topo",
				center: [-114.52, 45.50],
				zoom: 6,
				autoResize: true,
				infoWindow: popup
		});

		//create a domClass to customize the look of the popup window
		domClass.add(map.infoWindow.domNode, "myTheme");

		//LocateButton will zoom to where you are.  If tracking is enabled and the button becomes a toggle that creates an event to watch for location changes.
		var locateSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([215, 73, 255, 0.8]), 8),
				new Color([199, 0, 255, 0.8]));

		geoLocate = new LocateButton({
				map: map,
				symbol: locateSymbol,
				scale: 36111.909643
				//useTracking: true
		}, "LocateButton");
		geoLocate.startup();

		//add scalebar
		scalebar = new Scalebar({
				map: map,
				scalebarUnit: "dual"
		});

		var queryLayer, queryLabelLayer, placeLayer, zoomToLayer, zoomToLabelLayer, drawToolbarLayer, drawTextLayer;
		map.on("load", function () {
				//after map loads, connect to listen to mouse move & drag events
				map.on("mouse-move", showCoordinates);
				map.on("mouse-drag", showCoordinates);
				//add graphics layer for the hunt areas queries
				queryLayer = new GraphicsLayer();
				map.addLayer(queryLayer);
				queryLabelLayer = new GraphicsLayer();
				map.addLayer(queryLabelLayer);
				//add graphics layers for graphic outputs from the various tools (Place Search, Coordinate Search w/label, Draw shapes, Draw text)
				placeLayer = new GraphicsLayer();
				map.addLayer(placeLayer);
				zoomToLayer = new GraphicsLayer();
				map.addLayer(zoomToLayer);
				zoomToLabelLayer = new GraphicsLayer();
				map.addLayer(zoomToLabelLayer);
				//graphics layers for toolbar shapes and text.  Must be separated into different layers or they will not print properly on the map.
				drawToolbarLayer = new GraphicsLayer();
				map.addLayer(drawToolbarLayer);
				drawTextLayer = new GraphicsLayer();
				map.addLayer(drawTextLayer);
				map.reorderLayer(drawTextLayer, 1);
		});

		//show coordinates as the user scrolls around the map. In Desktop, it displays where ever the mouse is hovering.  In mobile, the user must tap the screen to get the coordinates.
		function showCoordinates(evt) {
				//the map is in web mercator but display coordinates in geographic (lat, long) & UTM NAD 27 Zone 11 & 12
				var utm11SR = new esri.SpatialReference({wkid: 26711});
				var utm12SR = new esri.SpatialReference({wkid: 26712});
				var gsvc = new esri.tasks.GeometryService("//tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
				var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
				//display mouse coordinates
				$("#info1").html("WGS84 DD: " + mp.x.toFixed(3) + ", " + mp.y.toFixed(3));
				if (mp.x <= -114 && mp.x >= -120) { //if hovering in zone 11
						gsvc.project([evt.mapPoint], utm11SR, function (result) {
								$("#info2").show();
								$("#info2").html("NAD27 UTM 11T: " + result[0].x.toFixed() + ', ' + result[0].y.toFixed());
						});
				} else if (mp.x > -114 && mp.x <= -108) { //if hovering in zone 12
						gsvc.project([evt.mapPoint], utm12SR, function (result) {
								$("#info2").show();
								$("#info2").html("NAD27 UTM 12T: 0" + result[0].x.toFixed() + ', ' + result[0].y.toFixed());
						});
				} else {
						$("#info2").hide();
				}
		}

		//add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
		basemapGallery = new BasemapGallery({
				showArcGISBasemaps: false,
				map: map,
		}, "basemapDiv");
		basemapGallery.startup();

		basemapGallery.on("error", function (msg) {
				console.log("basemap gallery error:  ", msg);
		});

		$("#basemapDiv").click(function () {
				//If a google basemap was previously selected, remove it to see the esri basemap (google maps are 'on top of' esri maps)
				map.removeLayer(googleLayer);
		});

		//Add the World Topo basemap to the basemap gallery.
		var worldTopo = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"});
		var worldTopoBasemap = new Basemap({
				layers: [worldTopo],
				title: "Esri World Topographic",
				thumbnailUrl: "src/images/world_topo.png"
		});
		basemapGallery.add(worldTopoBasemap);

		//Add the USA Topo basemap to the basemap gallery.
		var usgsTopo = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer"});
		var usgsBasemap = new Basemap({
				layers: [usgsTopo],
				title: "Esri USGS Topographic",
				thumbnailUrl: "src/images/usa_topo.jpg"
		});
		basemapGallery.add(usgsBasemap);

		//Add the Imagery with Labels basemap to the basemap gallery.
		var Imagery = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"});
		//var Reference = new BasemapLayer({url: "//services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer"});
		var imageryLabelBasemap = new Basemap({
				layers: [Imagery],
				title: "Esri Satellite Imagery",
				thumbnailUrl: "src/images/world_imagery.png"
		});
		basemapGallery.add(imageryLabelBasemap);

		//Add the National Geographic basemap to the basemap gallery.
		var natGeo = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer"});
		var natGeoBasemap = new Basemap({
				layers: [natGeo],
				title: "Esri Natl Geographic",
				thumbnailUrl: "src/images/natl_geo.png"
		});
		basemapGallery.add(natGeoBasemap);

		//Add Google Map basemap layers to the basemap gallery.  NOTE: GOOGLE BASEMAPS WILL NOT PRINT. Make sure your users know they must select an if they are going to create a Printable Map.
		googleLayer = new agsjs.layers.GoogleMapsLayer({
				id: 'google',
				apiOptions: {
						v: '3.6' // use a specific version is recommended for production system.
				},
				mapOptions: {
						streetViewControl: false // use false if do not want street view. Default is true.
				}
		});

		$("#googleHybrid").click(function () {
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_HYBRID);
		});

		$("#googleTerrain").click(function () {
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_TERRAIN);
		});
		
		//infoTemplate for the Big Game hunting restrictions layer
		var _bigGameHuntResInfoTemplate = new InfoTemplate();
		_bigGameHuntResInfoTemplate.setTitle("Big Game Hunting Restriction");
		_bigGameHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);
		var _uplandGameBirdTurkeyHuntResInfoTemplate = new InfoTemplate();
		_uplandGameBirdTurkeyHuntResInfoTemplate.setTitle("Upland Game Bird/Turkey Hunting Restriction");
		_uplandGameBirdTurkeyHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);
		var _uplandGameHuntResInfoTemplate = new InfoTemplate();
		_uplandGameHuntResInfoTemplate.setTitle("Upland Game Hunting Restriction");
		_uplandGameHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);
		var _waterfowlHuntResInfoTemplate = new InfoTemplate();
		_waterfowlHuntResInfoTemplate.setTitle("Waterfowl Hunting Restriction");
		_waterfowlHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);

		//popup window template for the Campground feature layer
		var campgroundPopupTemplate = new PopupTemplate({
				title: "Campground Info",
				fieldInfos: [{
						fieldName: "NAME", visible: true,
						fieldName: "Phone", visible: true,
						fieldName: "Rate", visible: true,
						fieldName: "Season", visible: true,
						fieldName: "Sites", visible: true,
						fieldName: "Max_Length", visible: true,
						fieldName: "Type", visible: true,
						fieldName: "URL", visible: true
				}]
		});
		campgroundPopupTemplate.setContent(
				"<b>Name: </b>${NAME}<br/>" +
				"<b>Phone: </b>${Phone}</br>" +
				"<b>Fee/Rate: </b>${Rate}</br>" +
				"<b>Season: </b>${Season}</br>" +
				"<b>Number of Sites: </b>${Sites}</br>" +
				"<b>Max # of Days at Site*: </b>${Max_Length}</br>" +
				"<b>* </b> 0 = No Limit</br>" +
				"<b>Site Administrator: </b>${Type}</br>"
		);

		//popup window template for the fire closure feature layer.
		var closurePopupTemplate = new PopupTemplate({
				title: "Fire Closure Info",
				fieldInfos: [{
						fieldName: "NAME", visible: true,
						fieldName: "URL", visible: true,
						fieldName: "UPDATE_", visible: true
				}]
		});
		closurePopupTemplate.setContent(
				"<b>Name: </b>${NAME}<br/>" +
				"<b>Effective Date: </b>${UPDATE_}<br/>" +
				"<a style='cursor:pointer;' href='${URL}' target='_blank'>InciWeb Description</a>"
		);

		//popup window template for the fire perimeter feature layer. NO WILDFIRES AT THIS TIME.  Keep for next year.
	 /*  var perimeterPopupTemplate = new PopupTemplate({
				title: "{fire_name} Fire",
				fieldInfos: [{
						fieldName: "incidentname", visible: true,
						fieldName: "gisacres", visible: true,
						fieldName: "active", visible: true,
						fieldName: "inciwebid", visible: true
				}]
		});
		perimeterPopupTemplate.setContent(
				"<b>Acres: </b>${gisacres}<br/>" +
				"<b>Active (Y/N): </b>${active}</br/>" +
				"<b><a target='_blank' href=//inciweb.nwcg.gov/incident/${inciwebid}>Click for InciWeb Information</a></b>"
		); */

		//add layers (or groups of layers) to the map.
		huntLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/Hunting/MapServer",
			 {id: "Hunt_Related_Layers"});
		huntLayers.setInfoTemplates({
			13: {infoTemplate: _bigGameHuntResInfoTemplate},
			14: {infoTemplate: _uplandGameBirdTurkeyHuntResInfoTemplate},
			15: {infoTemplate: _uplandGameHuntResInfoTemplate},
			16: {infoTemplate: _waterfowlHuntResInfoTemplate}
		});						
		adminLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/AdministrativeBoundaries/MapServer",
			 {id: "Administrative_Boundaries"});
/* 		surfaceMgmtLayer = new esri.layers.ArcGISTiledMapServiceLayer("https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_without_PriUnk/MapServer",
		{
			id: "Land_Management_Layer",
			opacity: 0.5
		}); */
		surfaceMgmtLayer = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Basemaps/SurfaceMgmt_BLMsymbology/MapServer",
		{
			id: "Land_Management_Layer",
			outFields: ["*"],
			opacity: 0.7
		});
		var trailLayers = new ArcGISDynamicMapServiceLayer("https://gis2.idaho.gov/arcgis/rest/services/DPR/Idaho_Trails_Map/MapServer",
			{id:"Roads_&_Trails_(zoom_in_to_activate)"});
		trailLayers.setVisibleLayers([4,5,6,7,8,9,10,11,12,13]);
		campgroundLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/ADM/Campgrounds/MapServer/0",
			{
				id: "Campgrounds",
				outFields: ["*"],
				infoTemplate: campgroundPopupTemplate
			});
		fireLayer0 = new FeatureLayer("https://fishandgame.idaho.gov/gis/rest/services/External/InciWeb_FireClosures/MapServer/0",
			{
				id: "Fire_Emergency_Closure_Areas",
				outFields: ['NAME', 'URL', 'UPDATE_'],
				infoTemplate: closurePopupTemplate
			});
		/* fireLayer1 = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/2",
			{
				id: "Active_Fire_Perimeter",
				outFields: ['gisacres', 'active', 'incidentname', 'inciwebid'],
				infoTemplate: perimeterPopupTemplate
			});
		fireLayer2 = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/4",
			{
				id: "Inactive_Fire_Perimeters",
				outFields: ['gisacres', 'active', 'incidentname', 'inciwebid'],
				infoTemplate: perimeterPopupTemplate
			});
		fireLayer3 = new FeatureLayer("https://rmgsc.cr.usgs.gov/ArcGIS/rest/services/geomac_dyn/MapServer/21",
			{
			id: "Past_Fire_Perimeters",
			opacity: "0.4"
			});
		fireLayer4 = new WMSLayer("https://activefiremaps.fs.fed.us/cgi-bin/mapserv.exe?map=conus.map&", { !!! URL NOT WORKING - UPDATE NEXT SEASON !!!
			id: "MODIS_Fire_Detection",
			opacity: "0.4",
			version: "1.1.1",
			visibleLayers: [4, 5, 6],
			format: "png"
		}); */
		
		map.addLayers([surfaceMgmtLayer, fireLayer0, adminLayers, huntLayers, trailLayers, campgroundLayer]);
		adminLayers.hide(); //So none of the layers are "on" except the GMU layer when the map loads.
		surfaceMgmtLayer.hide();
		trailLayers.hide();
		campgroundLayer.hide();
		fireLayer0.hide();

		//Add a table of contents using the layerList widget. Layers can be toggled on/off. Symbology is displayed.  Each "layer group" has a transparency slider.
		var layerList = new LayerList({
			map: map,
			removeUnderscores: true,
			showLegend: true,
			showSubLayers: true,
			showOpacitySlider: true,
			layers: [
				{
					layer: campgroundLayer
				}, {
					layer: trailLayers
				}, {
					layer: surfaceMgmtLayer
				}, {
					layer: adminLayers
				}, {
					layer: huntLayers
				}
			]
		}, "tocDiv");
		layerList.startup();
		
		layerList.on("load", function() {
			//Expand the Hunt Related Layers group on load.
			//layerList._layersNode.firstElementChild.className += " esriListExpand";
			//Add disclaimer and layer source information.
			$("#tocDiv_checkbox_2").before("<div class='disclaimer'>IMPORTANT: Please be sure to obtain landowner permission before entering or crossing private lands. Land surface management data maintained by BLM. <a href='//cloud.insideidaho.org/webApps/metadataViewer/default.aspx?path=%5c%5cintranet.rocket.net%5cinsideprod%5cdata%5canonymous%5cblm%5cRLTY_SMA_PUB_24K_POLY.shp.xml' target='_blank'>Learn More</a></div>");
			$("#tocDiv_checkbox_1").before("<div class='disclaimer'>Roads & trails data maintained by IDPR. <a href='//www.trails.idaho.gov/trails/' target='_blank'>Learn More</a></div>");
			$("#tocDiv_checkbox_0").before("<div class='disclaimer'>Campground data maintained by IDPR. <a href='//parksandrecreation.idaho.gov/activities/camping' target='_blank'>Learn More</a></div>");
			$("#fireLayersCheckbox").before("<div class='disclaimer'>Please contact USFS national forests for all road and trail closures.</div");
			$("label[for=tocDiv_checkbox_1]").css("color", "#ccc");
		});
		
		//uncheck fire Layer Checkboxes
		$("#fireLayersCheckbox").prop("checked", false);
		$("#fireLayer0Checkbox").prop("checked", false);
		//toggle all fireLayers off when the fireLayersCheckbox is unchecked.
		$("#fireLayersCheckbox").change(function () {
				if ($(this).prop('checked')) {
						fireLayer0.show();
						 $("#fireLayer0Checkbox").prop("checked", true);
						 } else {
						 fireLayer0.hide();
						$("#fireLayer0Checkbox").prop("checked", false);
				}
		});
		//toggle fireLayer0 on/off when checkbox is toggled on/off
		 $("#fireLayer0Checkbox").change(function () {
				if ($(this).prop('checked')) {
						fireLayer0.show();
						$("#fireLayersCheckbox").prop("checked", true);
				} else {
						fireLayer0.hide();
						$("#fireLayersCheckbox").prop("checked", false);
				}
		});

		//Enable mobile scrolling by calling $('.selectpicker').selectpicker('mobile'). The method for detecting the browser is left up to the user. This enables the device's native menu for select menus.
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
				$('.selectpicker').selectpicker('mobile');
		}

		//function to get variable values from the URL to query for hunt planner hunt area and/or zoom to a specific center coordinate and zoom level if using a "shared" map view link.
		function getVariableByName(name) {
				var query = window.location.search.substring(1);
				var vars = query.split("&");
				for (var i = 0; i < vars.length; i++) {
						var variableName = vars[i].split('=');
						if (variableName[0] == name) {
								return variableName[1]
						}
				}
		}

		//get the variables of areaID (hunt area, IOG area, or Access Yes! area), layerID (which layer to apply the ID query to), and label (what will appear in the legend).
		var areaID, layerID, label, urlZoom, urlX, urlY, homeURL, zoomLevel, centerpoint, cX, cY, newURL, extentI, extentC;
		window.onload = function () {
			$('.selectpicker').selectpicker('val', '');
			areaID = getVariableByName('val');
			layerID = getVariableByName('lyr');
			label = getVariableByName('lbl');
			urlZoom = getVariableByName('zoom');
			urlX = getVariableByName('X');
			urlY = getVariableByName('Y');
			if (typeof label != 'undefined') {
					var str = label;
					var res = label.replace("%26", "&");
					var cleanLabel = res.split('+').join(' ');
					label = cleanLabel;
			} else {
					label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined') {
					doQuery(areaID, layerID, label);
			}
			$("#queryLabel1").text(label);
			$("#queryLabel1Div").show();

			if (typeof urlZoom != 'undefined') {
					var point = new Point(urlX, urlY, new esri.SpatialReference({wkid: 4326}));
					map.setLevel(urlZoom);
					map.centerAt(point);
			}
		};

		//Change the Roads & Trails layer label depending on map scale.
		map.on("extent-change", function () {
				mapScale = map.getScale();
				if (mapScale < 4622324){
					$("label[for=tocDiv_checkbox_1]").css("color", "black");
					$("label[for=tocDiv_checkbox_1]").text("Roads & Trails");
				} else {
					$("label[for=tocDiv_checkbox_1]").css("color", "#ccc");
					$("label[for=tocDiv_checkbox_1]").text("Roads & Trails (zoom in to activate)");
				}
		});

		//toggle query layer on/off when checkbox is toggled on/off
		$("#queryCheckbox").change(function () {
				if ($(this).prop('checked')) {
						queryLayer.show();
						queryLabelLayer.show();
				} else {
						queryLayer.hide();
						queryLabelLayer.hide();
				}
		});

		var gmuID, elkID, chuntID, waterfowlID, gameDistributionID, newHighlight1, newHighlight2, newHighlight3, newHighlight4, newHighlight5;

		$("#btnQuery").click(function () {

				$("#loading").show();

				queryLayer.clear();
				queryLabelLayer.clear();
				$("#queryLabel1Div").hide();
				$("#queryLabel2Div").hide();
				$("#queryLabel3Div").hide();
				$("#queryLabel4Div").hide();
				$("#queryLabel5Div").hide();
				$("#kmlNav1").hide();
				$("#kmlNav2").hide();

				//get variable values from the dropdown lists in the hunt collapse window and run doQuery.
				if ($("#gmu").val()) {
						var gmuTypeValue = "";
						$("#gmu option:selected").each(function () {
								gmuTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						gmuID = gmuTypeValue.substring(0, gmuTypeValue.length - 1);
						//var layerID = "3";
						var label0 = $("#gmu option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof gmuID != 'undefined') {
								doQuery1(gmuID, label);
						}
						$("#queryLabel1").text(label);
						$("#queryLabel1Div").show();

						//Create a KML of the user-selected GMUs, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var gmuKMLlink = "//fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/3/query?where=ID in (" + gmuID +
								")&outfields=NAME&f=kmz"
						$("#gmuKML").attr("href", gmuKMLlink);
						$("#gmuKML").show();
				}

				if ($("#elkzone").val()) {
						var elkzoneTypeValue = "";
						$("#elkzone option:selected").each(function () {
								elkzoneTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						elkID = elkzoneTypeValue.substring(0, elkzoneTypeValue.length - 1);
						//var layerID = "4";
						var label0 = $("#elkzone option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = "Elk Zones: " + label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof elkID != 'undefined') {
								doQuery2(elkID, label);
						}
						$("#queryLabel2").text(label);
						$("#queryLabel2Div").show();

						//Create a KML of the user-selected Elk Zones, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var elkzoneKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/4/query?where=ID in (" +
								elkID + ")&outfields=NAME&f=kmz"
						$("#elkzoneKML").attr("href", elkzoneKMLlink);
						$("#elkzoneKML").show();
				}

				if ($("#chunt").val()) {
						var chuntTypeValue = "";
						$("#chunt option:selected").each(function () {
								chuntTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						chuntID = chuntTypeValue.substring(0, chuntTypeValue.length - 1);
						//var layerID = "5";
						var label0 = $("#chunt option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof chuntID != 'undefined') {
								doQuery3(chuntID, label);
						}
						$("#queryLabel3").text(label);
						$("#queryLabel3Div").show();

						//Create a KML of the user-selected controlled hunts, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var chuntKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/5/query?where=AreaID in (" +
								chuntID + ")&outfields=BigGame,HuntArea&f=kmz"
						$("#chuntKML").attr("href", chuntKMLlink);
						$("#chuntKML").show();
				}

				if ($("#waterfowl").val()) {
						var waterfowlTypeValue = "";
						$("#waterfowl option:selected").each(function () {
								waterfowlTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						waterfowlID = waterfowlTypeValue.substring(0, waterfowlTypeValue.length - 1);
						//var layerID = "6";
						var label0 = $("#waterfowl option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof waterfowlID != 'undefined') {
								doQuery4(waterfowlID, label);
						}
						$("#queryLabel4").text(label);
						$("#queryLabel4Div").show();

						//Create a KML of the user-selected waterfowl hunt areas, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var waterfowlKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/6/query?where=ID in (" +
								waterfowlID + ")&outfields=Area_Name&f=kmz"
						$("#waterfowlKML").attr("href", waterfowlKMLlink);
						$("#waterfowlKML").show();
				}

				if ($("#gameDistribution").val()) {
						var gameDistributionTypeValue = "";
						$("#gameDistribution option:selected").each(function () {
								gameDistributionTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						gameDistributionID = gameDistributionTypeValue.substring(0, gameDistributionTypeValue.length - 1);
						//var layerID = "7";
						var label0 = $("#gameDistribution option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ") + " General Distribution";

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Game Distribution";
						}
						if (typeof gameDistributionID != 'undefined') {
								doQuery5(gameDistributionID, label);
						}
						$("#queryLabel5").text(label);
						$("#queryLabel5Div").show();

						//Create a KML of the user-selected game animal distributions, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var gameDistributionKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/7/query?where=ID in (" +
								gameDistributionID + ")&outfields=NAME&f=kmz"
						$("#gameDistributionKML").attr("href", gameDistributionKMLlink);
						$("#gameDistributionKML").show();
				}

				if ($("#gmu").val() != null || $("#elkzone").val() != null || $("#chunt").val() != null || $("#waterfowl").val() != null ||
						$("#gameDistribution").val() != null) {
						$("#kmlNav1").show();
						$("#kmlNav2").show();
						$("#kmlNav1").effect("highlight", {color: 'yellow'}, 3000);
						$("#kmlNav2").effect("highlight", {color: 'yellow'}, 3000);
				}
		});

		$("#btnClearHighlighted").click(function () {
				queryLayer.clear();
				queryLabelLayer.clear();
				$("#queryLabelDiv").hide();
				$('.selectpicker').selectpicker('val', '');
				$("#queryLabel1Div").hide();
				$("#queryLabel2Div").hide();
				$("#queryLabel3Div").hide();
				$("#queryLabel4Div").hide();
				$("#queryLabel5Div").hide();
				$("#kmlNav1").hide();
				$("#kmlCollapse").hide();
				$("#gmuKML").hide();
				$("#elkzoneKML").hide();
				$("#chuntKML").hide();
				$("#waterfowlKML").hide();
				$("#gameDistributionKML").hide();
		})

		function doQuery(areaID, layerID, label) {
				//initialize query tasks
				newQueryTask = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/" + layerID);

				//initialize query
				newQuery = new Query();
				newQuery.returnGeometry = true;
				newQuery.outFields = ["*"]
				newHighlight = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([154,32,219]), 3),
						new Color([154,32,219,0.1])
				);
				newHighlightHatched = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([154,32,219]), 3),
						new Color([154,32,219])
				);

				newQuery.where = "ID IN (" + areaID + ")";
				newQueryTask.execute(newQuery, showResults);
		}

		function doQuery1(gmuID, label) {
				//initialize query tasks
				newQueryTask1 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/3");

				//initialize query
				newQuery1 = new Query();
				newQuery1.returnGeometry = true;
				newQuery1.outFields = ["ID", "NAME"]
				newHighlight1 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([154, 32, 219]), 3),
						new Color([154, 32, 219, 0.1])
				);

				newQuery1.where = "ID IN (" + gmuID + ")";
				newQueryTask1.execute(newQuery1, showResults1);
		}

		function doQuery2(elkID, label) {
				//initialize query tasks
				newQueryTask2 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/4");

				//initialize query
				newQuery2 = new Query();
				newQuery2.returnGeometry = true;
				newQuery2.outFields = ["ID", "NAME"]
				newHighlight2 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([0, 255, 255]), 3),
						new Color([0, 255, 255, 0.1])
				);

				newQuery2.where = "ID IN (" + elkID + ")";
				newQueryTask2.execute(newQuery2, showResults2);
		}

		function doQuery3(chuntID, label) {
				//initialize query tasks
				newQueryTask3 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/5");

				//initialize query
				newQuery3 = new Query();
				newQuery3.returnGeometry = true;
				newQuery3.outFields = ["FLAG", "AreaID", "BigGame", "HuntArea"]
				newHighlight3 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([18, 237, 18]), 3),
						new Color([18, 237, 18, 0.1])
				);
				newHighlight3Hatched = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([18, 237, 18]), 3),
						new Color([18, 237, 18])
				);

				newQuery3.where = "AreaID IN (" + chuntID + ")";
				newQueryTask3.execute(newQuery3, showResults3);
		}

		function doQuery4(waterfowlID, label) {
				//initialize query tasks
				newQueryTask4 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/6");

				//initialize query
				newQuery4 = new Query();
				newQuery4.returnGeometry = true;
				newQuery4.outFields = ["ID", "Area_Name"]
				newHighlight4 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([255, 157, 0]), 3),
						new Color([255, 157, 0, 0.1])
				);

				newQuery4.where = "ID IN (" + waterfowlID + ")";
				newQueryTask4.execute(newQuery4, showResults4);
		}

		function doQuery5(gameDistributionID, label) {
				//initialize query tasks
				newQueryTask5 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/7");

				//initialize query
				newQuery5 = new Query();
				newQuery5.returnGeometry = true;
				newQuery5.outFields = ["ID", "SCINAME", "NAME"]
				newHighlight5 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([255, 0, 225]), 3),
						new Color([255, 0, 225, 0.1])
				);

				newQuery5.where = "ID IN (" + gameDistributionID + ")";
				newQueryTask5.execute(newQuery5, showResults5);
		}

		//Funtion to open the hunting restrictions dialog if a hunter has queried a "flagged" hunt.
		function showAlert() {
				$("#huntWarningModal").modal('show');
		}

		function showResults(featureSet) {
				//Performance enhancer - assign featureSet array to a single variable.
				var newFeatures = featureSet.features;
				//Loop through each feature returned
				for (var i = 0, il = newFeatures.length; i < il; i++) {
						//Get the current feature from the featureSet.
						//Feature is a graphic
						var geometry = featureSet.geometry;
						var newGraphic = newFeatures[i];
						var polyExtent = newGraphic.geometry.getExtent();
						var polyCenter = polyExtent.getCenter();
						newGraphic.setSymbol(newHighlight);
						var queryMapLabel = label;

						//Add graphic to the map graphics layer.
						queryLayer.add(newGraphic);

						//If the selected hunt is "flagged" aka has further restrictions, give it hatched symbology as well.
						if (newGraphic.attributes.FLAG == 1){
								newGraphic.setSymbol(newHighlightHatched);
								showAlert();
						} else {
								newGraphic.setSymbol(newHighlight);
						}

						//Add label to the graphics.
						var font = new esri.symbol.Font();
						font.setSize("10pt");
						font.setFamily("Helvetica");
						font.setWeight(Font.WEIGHT_BOLD);
						var textSymbol = new TextSymbol(queryMapLabel);
						textSymbol.setColor(new esri.Color([0,0,0]));
						textSymbol.setFont(font);
						textSymbol.setHorizontalAlignment("center");
						textSymbol.setVerticalAlignment("middle");
						textSymbol.setOffset(17, 0);
						//Add label at the selected area center.
						var pt = new Point(polyCenter, map.spatialReference);
						var queryMapLabelGraphic = new Graphic(pt, textSymbol);
						queryLabelLayer.add(queryMapLabelGraphic);

						var selectionExtent = esri.graphicsExtent(newFeatures);
						map.setExtent(selectionExtent.expand(1.25), true);

						//Zoom to graphics extent.
						if (urlZoom == '') {
								var selectionExtent = esri.graphicsExtent(newFeatures);
								map.setExtent(selectionExtent.expand(1.25), true);
						}
				}

				//Populate the queryLabel Div that will show the query result label in the legend.
				$("#queryLabelDiv").show();
				$("#queryCheckbox").prop('checked', true);
		}

		function showResults1(featureSet) {
				//Performance enhancer - assign featureSet array to a single variable.
				var newFeatures1 = featureSet.features;
				//Loop through each feature returned
				for (var i = 0, il = newFeatures1.length; i < il; i++) {
					//Get the current feature from the featureSet.
					//Feature is a graphic
					var geometry = featureSet.geometry;
					var newGraphic1 = newFeatures1[i];
					var polyExtent = newGraphic1.geometry.getExtent();
					var polyCenter = polyExtent.getCenter();
					newGraphic1.setSymbol(newHighlight1);
					queryMapLabel1 = "UNIT " + newGraphic1.attributes.NAME;
					//Add graphic to the map graphics layer.
					queryLayer.add(newGraphic1);

					//Add label to the graphics.
					var font = new esri.symbol.Font();
					font.setSize("10pt");
					font.setFamily("Helvetica");
					font.setWeight(Font.WEIGHT_BOLD);
					var textSymbol = new TextSymbol(queryMapLabel1);
					textSymbol.setColor(new esri.Color([154, 32, 219]));
					textSymbol.setFont(font);
					textSymbol.setHorizontalAlignment("center");
					textSymbol.setVerticalAlignment("middle");
					textSymbol.setOffset(17, 0);
					//Add label at the selected area center.
					var pt = new Point(polyCenter, map.spatialReference);
					var queryMapLabel1Graphic = new Graphic(pt, textSymbol);
					queryLabelLayer.add(queryMapLabel1Graphic);

					//Zoom to full extent.
					zoomToState();
				}

				//Populate the queryLabel Div that will show the query result label in the legend.
				$("#queryLabelDiv").show();
				$("#queryCheckbox").prop('checked', true);
		}

		function showResults2(featureSet) {
				//Performance enhancer - assign featureSet array to a single variable.
				var newFeatures2 = featureSet.features;
				//Loop through each feature returned
				for (var i = 0, il = newFeatures2.length; i < il; i++) {
					//Get the current feature from the featureSet.
					//Feature is a graphic
					var geometry = featureSet.geometry;
					var newGraphic2 = newFeatures2[i];
					var polyExtent = newGraphic2.geometry.getExtent();
					var polyCenter = polyExtent.getCenter();
					newGraphic2.setSymbol(newHighlight2);
					var queryMapLabel2 = newGraphic2.attributes.NAME + " Elk Zone";
					//Add graphic to the map graphics layer.
					queryLayer.add(newGraphic2);

					//Add label to the graphics.
					var font = new esri.symbol.Font();
					font.setSize("10pt");
					font.setFamily("Helvetica");
					font.setWeight(Font.WEIGHT_BOLD);
					var textSymbol = new TextSymbol(queryMapLabel2);
					textSymbol.setColor(new esri.Color([30, 201, 201]));
					textSymbol.setFont(font);
					textSymbol.setHorizontalAlignment("center");
					textSymbol.setVerticalAlignment("middle");
					textSymbol.setOffset(17, 0);
					//Add label at the selected area center.
					var pt = new Point(polyCenter, map.spatialReference);
					var queryMapLabel2Graphic = new Graphic(pt, textSymbol);
					queryLabelLayer.add(queryMapLabel2Graphic);

					//Zoom to full extent.
					zoomToState();
				}

				//Populate the queryLabel Div that will show the query result label in the legend.
				$("#queryLabelDiv").show();
				$("#queryCheckbox").prop('checked', true);
		}



	function showResults3(featureSet) {
		//Performance enhancer - assign featureSet array to a single variable.
		var newFeatures3 = featureSet.features;
		//Loop through each feature returned
		for (var i=0, il=newFeatures3.length; i<il; i++) {
			//Get the current feature from the featureSet.
			//Feature is a graphic
			var geometry = featureSet.geometry;
			var newGraphic3 = newFeatures3[i];
			var polyExtent = newGraphic3.geometry.getExtent();
			var polyCenter = polyExtent.getCenter();
			if (newGraphic3.attributes.FLAG == 1){
				newGraphic3.setSymbol(newHighlight3Hatched);
									showAlert();
			} else {
				newGraphic3.setSymbol(newHighlight3);
			}
			var queryMapLabel3 = newGraphic3.attributes.BigGame + " - " + newGraphic3.attributes.HuntArea;

			//Add graphic to the map graphics layer.
			queryLayer.add(newGraphic3);
			
			//Add label to the graphics.		
			var font = new esri.symbol.Font();
			font.setSize("10pt");
			font.setFamily("Helvetica");
			font.setWeight(Font.WEIGHT_BOLD);
			var textSymbol = new TextSymbol(queryMapLabel3);
			textSymbol.setColor (new esri.Color([0,0,0]));
			textSymbol.setFont(font);
			textSymbol.setHorizontalAlignment("center");
			textSymbol.setVerticalAlignment("middle");
			textSymbol.setOffset(17, 0);
			//Add label at the selected area center.
			var pt = new Point(polyCenter,map.spatialReference);
			var queryMapLabel3Graphic = new Graphic (pt, textSymbol);
			//queryLabelLayer.add(queryMapLabel3Graphic);
			
			//Zoom to full extent.
			zoomToState();
		}
		//Populate the queryLabel Div that will show the query result label in the legend.
		$("#queryLabelDiv").show();
		$("#queryCheckbox").prop('checked', true);
	}

	function showResults4(featureSet) {
		//Performance enhancer - assign featureSet array to a single variable.
		var newFeatures4 = featureSet.features;
		//Loop through each feature returned
		for (var i=0, il=newFeatures4.length; i<il; i++) {
			//Get the current feature from the featureSet.
			//Feature is a graphic
			var geometry = featureSet.geometry;
			var newGraphic4 = newFeatures4[i];
			var polyExtent = newGraphic4.geometry.getExtent();
			var polyCenter = polyExtent.getCenter();
			newGraphic4.setSymbol(newHighlight4);
			var queryMapLabel4 = newGraphic4.attributes.Area_Name;
			//Add graphic to the map graphics layer.
			queryLayer.add(newGraphic4);
			
			//Add label to the graphics.		
			var font = new esri.symbol.Font();
			font.setSize("10pt");
			font.setFamily("Helvetica");
			font.setWeight(Font.WEIGHT_BOLD);
			var textSymbol = new TextSymbol(queryMapLabel4);
			textSymbol.setColor (new esri.Color([232,146,18]));
			textSymbol.setFont(font);
			textSymbol.setHorizontalAlignment("center");
			textSymbol.setVerticalAlignment("middle");
			textSymbol.setOffset(17, 0);
			//Add label at the selected area center.
			var pt = new Point(polyCenter,map.spatialReference);
			var queryMapLabel4Graphic = new Graphic (pt, textSymbol);
			queryLabelLayer.add(queryMapLabel4Graphic);
			
			//Zoom to full extent.
			zoomToState();
		}
	
		//Populate the queryLabel Div that will show the query result label in the legend.
		$("#queryLabelDiv").show();
		$("#queryCheckbox").prop('checked', true);
	}

	function showResults5(featureSet) {
		//Performance enhancer - assign featureSet array to a single variable.
		var newFeatures5 = featureSet.features;

		//Loop through each feature returned
		for (var i=0, il=newFeatures5.length; i<il; i++) {
			//Get the current feature from the featureSet.
			//Feature is a graphic
			var newGraphic5 = newFeatures5[i];
			newGraphic5.setSymbol(newHighlight5);

			//Add graphic to the map graphics layer.
			queryLayer.add(newGraphic5);
			
			//Zoom to full extent.
			zoomToState();
		}
		
		//Populate the queryLabel Div that will show the query result label in the legend.
		$("#queryLabelDiv").show();
		$("#queryCheckbox").prop('checked', true);
	}

	function zoomToState(){
		var stateExtent = new esri.geometry.Extent(-119.925, 40.439, -109.137, 50.199);
		map.setExtent(stateExtent);
		$("#loading").hide();
	};

	//Allow users to add GPX data to the map.  Other formats may be added later, such as KML.
	var layer, name;
	var layers=[];
	var portalUrl = 'https://www.arcgis.com';

	 on(dom.byId("uploadForm"), "change", function (evt) {
		var fileName = evt.target.value.toLowerCase();
		if (sniff("ie")) { //filename is full path in IE so extract the file name
			var arr = fileName.split("\\");
			fileName = arr[arr.length - 1];
		}
		if (fileName.indexOf(".gpx") !== -1) {//is file a gpx - if not notify user 
			generateFeatureCollection(fileName);
		}else{
			$("#upload-status").html('<p style="color:red">INVALID FILE TYPE. Choose a .gpx file</p>');
	 }
	});

	function generateFeatureCollection(fileName) {     
		name = fileName.split(".");
		//Chrome and IE add c:\fakepath to the value - we need to remove it
		//See this link for more info: http://davidwalsh.name/fakepath
		name = name[0].replace("c:\\fakepath\\","");
		
		$("#upload-status").html("<b>Loading… </b>" + name); 
		
		//Define the input params for generate see the rest doc for details
		//http://www.arcgis.com/apidocs/rest/index.html?generate.html
		var params = {
			'name': name,
			'targetSR': map.spatialReference,
			'maxRecordCount': 1000,
			'enforceInputFileSizeLimit': true,
			'enforceOutputJsonSizeLimit': true
		};
		//generalize features for display Here we generalize at 1:40,000 which is approx 10 meters 
		//This should work well when using web mercator.  
		var extent = scaleUtils.getExtentForScale(map,40000); 
		var resolution = extent.getWidth() / map.width;
		params.generalize = true;
		params.maxAllowableOffset = resolution;
		params.reducePrecision = true;
		params.numberOfDigitsAfterDecimal = 0;
		
		var myContent = {
			'filetype': 'gpx',
			'publishParameters': JSON.stringify(params),
			'f': 'json',
			'callback.html': 'textarea'
		};
		//use the rest generate operation to generate a feature collection from the zipped shapefile 
		request({
			url: portalUrl + '/sharing/rest/content/features/generate',
			content: myContent,
			form: dom.byId('uploadForm'),
			handleAs: 'json',
			load: lang.hitch(this, function (response) {
				if (response.error) {
					errorHandler(response.error);
					return;
				}
				var layerName = response.featureCollection.layers[0].layerDefinition.name;
				$("#upload-status").html("<b>Loaded: </b>" + layerName);
				addGPXToMap(response.featureCollection);
			}),
			error: lang.hitch(this, errorHandler)
		});
	}
	function errorHandler(error) {
		$("#upload-status").html("<p style='color:red'>" + error.message + "</p>");
	}
	
	function addGPXToMap(featureCollection) {
		//add the GPX to the map and zoom to the feature collection extent
		//If you want to persist the feature collection when you reload browser you could store the collection in 
		//local storage by serializing the layer using featureLayer.toJson()  see the 'Feature Collection in Local Storage' sample
		//for an example of how to work with local storage. 
		var fullExtent;
		layers = [];
		arrayUtils.forEach(featureCollection.layers, function (layer) {
			var infoTemplate = new InfoTemplate("", "${*}");
			infoTemplate.setTitle(name + " Attributes");
			layer = new FeatureLayer(layer, {
				outfields:["*"],
				infoTemplate: infoTemplate
			});
			//change default symbol if desired. Comment this out and the layer will draw with the default symbology
			changeRenderer(layer);
			fullExtent = fullExtent ? fullExtent.union(layer.fullExtent) : layer.fullExtent;
			layers.push(layer);
			
		});
		map.addLayers(layers);
		map.setExtent(fullExtent.expand(1.25), true);
		$("#upload-status").html("");
		clearFileInputField('uploadForm');
		$("#uploadLabelDiv").show();
		$("#uploadCheckbox").prop('checked', true);
	}
	
	function changeRenderer(layer) {
		//change the default symbol for the feature collection for polygons and points
		var symbol = null;
		switch (layer.geometryType) {
		case 'esriGeometryPoint':
			symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
					new Color([0,0,0]), 1),
					new Color ([255,0,0]));
			break;
		case 'esriGeometryPolygon':
			symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, 
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, 
				new Color([255, 0, 0]), 1), 
				new Color([255, 0, 0]));
			break;
		}
		if (symbol) {
			layer.setRenderer(new SimpleRenderer(symbol));
		}
		if (layer.geometryType == 'esriGeometryPoint'){
			$("#uploadLabel1Div").show();
		}
			if (layer.geometryType == 'esriGeometryPolyline'){
			$("#uploadLabel2Div").show();
		}
	}

	//Clear the gpx upload form file name.
	function clearFileInputField(tagId){ 
		dojo.byId(tagId).innerHTML = dojo.byId(tagId).innerHTML;
	}

	function layerVisibility(layer) {
		(layer.visible) ? layer.hide() : layer.show();
	}
		
	//Clear the uploaded GPX files from the map.
	$("#btnClearUpload").click (function(){
		jQuery.each(layers, function(index, value){
				layerVisibility(layers[index]);
			});
			
		$("#uploadLabelDiv").hide();
		$("#uploadLabel1Div").hide();
		$("#uploadLabel2Div").hide();
		$("#uploadCheckbox").prop('checked', false);
	});

	//toggle GPX layers on/off when checkbox is toggled on/off
	$("#uploadCheckbox").change(function(){	
		jQuery.each(layers, function(index, value){
			layerVisibility(layers[index]);
		});
	});		

	//Create a search box.
		var search = new Search({
			map: map,
			enableInfoWindow: false
	  }, "geosearch");
		
		//Create extent to limit search
		var extent = new Extent({
		  "spatialReference": {
				"wkid": 102100
				},
			"xmin": -13039873.23,
			"xmax": -12316737.55,
			"ymin": 5149759.51,
			"ymax": 6295543.43
		});

    //set the source's searchExtent to the extent specified above   
    search.sources[0].searchExtent = extent;
		
	  search.startup();
		
	//clear place search graphics layer
	$("#btnClearPlace").click (function(){
			search.clear();
	});
	
	//the user inputs a long, lat coordinate and a flag icon is added to that location and the location is centered and zoomed to on the map.
	$("#btnCoordZoom").click (function(){
		zoomToCoordinate();
	});

	//zoom to the coordinate and add a graphic
	function zoomToCoordinate(){
		var zoomToGraphic;
		var longitude = $("#longitudeInput").val();
		var latitude = $("#latitudeInput").val();
		var symbol = new PictureMarkerSymbol('http://js.arcgis.com/3.19/esri/dijit/Search/images/search-pointer.png', 35, 35);
		var pt = new Point(longitude, latitude);
		var labelSymbol = new TextSymbol(longitude + ", " + latitude);
		labelSymbol.setColor (new Color("black"));
		var font = new Font();
		font.setSize("14pt");
		font.setFamily("Helvetica");
		font.setWeight(Font.WEIGHT_BOLD);
		labelSymbol.setFont(font);
		labelSymbol.setHorizontalAlignment("left");
		labelSymbol.setVerticalAlignment("middle");
		labelSymbol.setOffset(17, 0);
		zoomToGraphic = new Graphic(pt, symbol);
		zoomToLabel = new Graphic(pt, labelSymbol);
		zoomToLayer.add(zoomToGraphic);
		zoomToLabelLayer.add(zoomToLabel);
		map.centerAndZoom(pt, 12);
	}

	//clear coordinate search graphics layer
	$("#btnClear").click (function(){
		zoomToLayer.clear();
		zoomToLabelLayer.clear();
		longitude = $("#longitudeInput").val("");
		latitude = $("#latitudeInput").val("");
	});

	//add the measurement tools
	var pms = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
		new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
			new Color([165, 24, 221, .55], 1)));
		pms.setColor(new Color([165, 24, 221, .55]));
		pms.setSize("8");
	var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
		new Color([165, 24, 221, .55]), 3);

	var measurement = new Measurement({
		map: map,
		lineSymbol:sls,
		pointSymbol:pms
	}, dom.byId("measurementDiv"));
	measurement.startup();

	$("#clearMeasureResults").click(function(){
		measurement.clearResult();
		$("#measureResultsDiv").hide();
	});

	//Clear the measurement results div when starting a new measurement.
	measurement.on("measure-start", function() {
		$("#Results").empty();
	});
	
	//Add tool instructions in measure window.
	measurement.on("tool-change", function(){
		var measureTool = measurement.getTool();
		measureTool = measureTool.toolName;
			if(measureTool === "area"){
				$("#MeasureInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to polygon. Double-click/tap to finish.</h4>");
			} else if(measureTool === "distance"){
				$("#MeasureInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to the line. Double-click/tap to finish.</h4>");
			} else if (measureTool === "location"){
				$("#MeasureInstructions").html("<h4 class='red'>Click or tap a location on the map to add a point.</h4>");
			}	
	});
	
	//Disable popups when the measurement window is uncollapsed.
	$('#measureCollapse').on('show.bs.collapse', function(){
		 map.setInfoWindowOnClick(false);
	});

	//Show the measurement results in the bottom right-hand corner.
	measurement.on("measure-end", function () {
		var measureTool = measurement.getTool();
		measureTool = measureTool.toolName;
		//measurement.setTool(measurement.activeTool, false);  //THIS WILL SHUT THE ACTIVE TOOL OFF.
		var resultValue = measurement.resultValue.domNode.innerHTML;
		c = measurement.markerLatitude;
		c = c.innerHTML;
		d = measurement.markerLongitude;
		d = d.innerHTML;
		locationXY = c + ", " + d;
		var copyResultValue = document.getElementById('Results');
		if(measureTool === "location"){
			copyResultValue.innerHTML = locationXY;
		}else{
			copyResultValue.innerHTML = resultValue;
		}
		$("#measureResultsDiv").effect("highlight", {color: 'yellow'}, 3000);
	});

	//When the measure tool is collapes, deactive all measure tools, clear the results, and enable popups. 
	$('#measureCollapse').on('hide.bs.collapse', function(){
		map.setInfoWindowOnClick(true);
		measurement.clearResult();
		measurement.setTool("area", false);
		measurement.setTool("distance", false);
		measurement.setTool("location", false);
		console.log("Popups should be enabled");
		$("#measureResultsDiv").hide();
		$("#MeasureInstructions").html("");
	});

	//add the Draw toolbar.
	var toolbar;
	map.on("load", createToolbar);

	// loop through all dijits, connect onClick event
	// listeners for buttons to activate drawing tools
	registry.forEach(function(d) {
		// d is a reference to a dijit
		// could be a layout container or a button
		if ( d.declaredClass === "dijit.form.Button" ) {
			d.on("click", activateTool);
		}
	});
	
	function activateTool() {
		var tool;
		/* if (this.label === "Add Text") {
		toolbar.activate(Draw.POINT);
		} else { */
		tool = this.name.toUpperCase().replace(/ /g, "_");
		toolbar.activate(Draw[tool]);
		//}	
		if(tool === "FREEHAND_POLYGON"){
			$("#DrawInstructions").html("<h4 class='red'>Press down to start and let go to finish</h4>");
		} else if(tool === "POLYGON"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to polygon. Double-click/tap to finish.</h4>");
		} else if (tool === "POINT"){
			$("#DrawInstructions").html("<h4 class='red'>Click or tap a location on the map to add a point.</h4>");
		} else if (tool === "MULTI_POINT"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap a location on the map to start adding points. Double-click/tap to finish.</h4>");
		} else if (tool === "POLYLINE"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to the line. Double-click/tap to finish.</h4>");
		} else if (tool === "FREEHAND_POLYLINE" || tool === "FREEHAND POLYGON"){
			$("#DrawInstructions").html("<h4 class='red'>Press down to start and let go to finish.</h4>");
		} else if (tool === "CIRCLE"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to add a circle or press down to start and let go to finish.</h4>");
		} else if (tool === "TEXT"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to add text to the map.</h4>");
		}
	}

	function createToolbar(themap) {
		toolbar = new Draw(map);
		toolbar.on("draw-end", addToMap);
	}

	function addToMap(evt) {
		var symbol;
		toolbar.deactivate();
		switch (evt.geometry.type) {
			/*case "point":
				symbol= new TextSymbol($("#userTextBox").val()).setColor(
					new Color([255, 0, 0])).setFont(
					new Font("16pt").setWeight(Font.WEIGHT_BOLD)).setHorizontalAlignment("left");
				break;*/
			case "multipoint":
				symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 15,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
					new Color([255,114,0]),0.5),
					new Color([255,114,0]));
				break;
			case "polyline":
				symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
					new Color([255,114,0]),2);
				break;
			default:
				symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([255,114,0]),2),
				new Color([255,114,0,0.25]));
				break; 
		}
		var drawGraphic = new Graphic(evt.geometry, symbol);
		drawToolbarLayer.add(drawGraphic);
	}

	//fire the text graphic in a separate graphics layer than the other draw symbols otherwise it will show as just a point when using the PrintTask GP Tool.
	$("#dijit_form_Button_6_label").on("click", drawPoint);

	//active the draw.POINT tool
	var pointTool;
	function drawPoint(){
		//change the tooltip text for the Draw.POINT tool.
		esri.bundle.toolbars.draw.addPoint = "Click to add text to the map.";
		pointTool = new Draw(map);
		pointTool.activate(Draw.POINT);
		pointTool.on("draw-end", addText);
	}
	//add text to the point
	function addText(evt){
		pointTool.deactivate();
		var userText = $("#userTextBox").val();
		var textSymbol= new TextSymbol(userText);
		textSymbol.setColor (new esri.Color("black"));
		var font = new esri.symbol.Font();
		font.setSize("14pt");
		font.setFamily("Helvetica");
		font.setWeight(Font.WEIGHT_BOLD);
		textSymbol.setFont(font);
		var textGraphic = new Graphic(evt.geometry, textSymbol);
		drawTextLayer.add(textGraphic);
	};

	//clear all shape graphics
	$("#btnClearGraphic").click (function(){
		drawToolbarLayer.clear();
	});
	//clear all text graphics
	$("#btnClearText").click (function(){
		drawTextLayer.clear();
	});
	
	//Disable popups when the draw window is uncollapsed.
	$('#drawCollapse').on('show.bs.collapse', function(){
		 map.setInfoWindowOnClick(false);
	});
	//Enable popups when the draw window is uncollapsed.
	$('#drawCollapse').on('hide.bs.collapse', function(){
		map.setInfoWindowOnClick(true);
		$("#DrawInstructions").html("");
	});

	//Create PDF using PrintTask	
	$("#btnPDF").click (function(){
		$("#div_for_pdf").hide();
		submitPrint();
	});

	function submitPrint() {
		var printParams = new PrintParameters();
		printParams.map = map;
		var status = dojo.byId("printStatus");
		status.innerHTML = "Creating Map...";
		$("#loadingPrint").show();
		
		var template = new PrintTemplate();
		var printTitle = $("#txtTitle").val();
		template.layoutOptions = {
			"titleText": printTitle
		};
		var format = $("#format").val();
		template.format = format;
		var layout = $("#layout").val();
		template.layout = layout;
		template.exportOptions = {
			dpi: 300
		};
		printParams.template = template;
		
		var printServiceUrl ='https://fishandgame.idaho.gov/gis/rest/services/Custom_IDFG_ExportWebMapTask/GPServer/Export%20Web%20Map';
		/* var printServiceUrl ='https://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task'; */
		var printTask = new esri.tasks.PrintTask(printServiceUrl);	

		var deferred = printTask.execute(printParams);
		deferred.addCallback(function (response){  
			//alert(JSON.stringify(response));		
			status.innerHTML = "";
			//open the map PDF or image in a new browser window.
			var new_url_for_map = response.url.replace("sslifwisiis","fishandgame.idaho.gov");
			var currentTime = new Date();
			var unique_PDF_url = new_url_for_map += "?ts="+currentTime.getTime();
			//PDFwindow = window.open(new_url_for_map);
			if (typeof(PDFwindow) == 'undefined') {
				$("#div_for_pdf").html("<a href='" + unique_PDF_url + "'>CLICK HERE TO DOWNLOAD YOUR MAP</a><br/><br/>");
				$("#div_for_pdf a").attr('target', '_blank');
				$("#div_for_pdf a").attr("class", 'red');
				$("#div_for_pdf").click(function(){
					$("#div_for_pdf").html("");
				});
			} else {
				window.open(new_url_for_map);
			}
			$("#div_for_pdf").show();
			$("#loadingPrint").hide();
		});
		
		deferred.addErrback(function (error) {
			console.log("Print Task Error = " + error);
			status.innerHTML = "Whoops!  Something went wrong!  Please try again later.";
			$("#printStatus").show();
			$("#printStatus").attr("class", 'red');
			$("#loadingPrint").hide();
		});
		$("#pdfCollapse").on('hide.bs.collapse', function(){
			$("#printStatus").hide();
		});
	};
				
	// Show modal dialog, hide nav
	$(document).ready(function(){
		//populate the GMU dropdown with JSON vars.
		var gmuList = [{"ID":"1","NAME":"UNIT 1"},{"ID":"2","NAME":"UNIT 2"},{"ID":"3","NAME":"UNIT 3"},{"ID":"4","NAME":"UNIT 4"},{"ID":"5","NAME":"UNIT 4A"},{"ID":"6","NAME":"UNIT 5"},{"ID":"7","NAME":"UNIT 6"},{"ID":"8","NAME":"UNIT 7"},{"ID":"9","NAME":"UNIT 8"},{"ID":"10","NAME":"UNIT 8A"},{"ID":"11","NAME":"UNIT 9"},{"ID":"13","NAME":"UNIT 10"},{"ID":"14","NAME":"UNIT 10A"},{"ID":"15","NAME":"UNIT 11"},{"ID":"16","NAME":"UNIT 11A"},{"ID":"17","NAME":"UNIT 12"},{"ID":"18","NAME":"UNIT 13"},{"ID":"19","NAME":"UNIT 14"},{"ID":"20","NAME":"UNIT 15"},{"ID":"21","NAME":"UNIT 16"},{"ID":"22","NAME":"UNIT 16A"},{"ID":"23","NAME":"UNIT 17"},{"ID":"24","NAME":"UNIT 18"},{"ID":"25","NAME":"UNIT 19"},{"ID":"26","NAME":"UNIT 19A"},{"ID":"27","NAME":"UNIT 20"},{"ID":"28","NAME":"UNIT 20A"},{"ID":"29","NAME":"UNIT 21"},{"ID":"30","NAME":"UNIT 21A"},{"ID":"31","NAME":"UNIT 22"},{"ID":"32","NAME":"UNIT 23"},{"ID":"33","NAME":"UNIT 24"},{"ID":"34","NAME":"UNIT 25"},{"ID":"35","NAME":"UNIT 26"},{"ID":"36","NAME":"UNIT 27"},{"ID":"37","NAME":"UNIT 28"},{"ID":"38","NAME":"UNIT 29"},{"ID":"39","NAME":"UNIT 30"},{"ID":"40","NAME":"UNIT 30A"},{"ID":"41","NAME":"UNIT 31"},{"ID":"42","NAME":"UNIT 32"},{"ID":"43","NAME":"UNIT 32A"},{"ID":"44","NAME":"UNIT 33"},{"ID":"45","NAME":"UNIT 34"},{"ID":"46","NAME":"UNIT 35"},{"ID":"47","NAME":"UNIT 36"},{"ID":"48","NAME":"UNIT 36A"},{"ID":"49","NAME":"UNIT 36B"},{"ID":"50","NAME":"UNIT 37"},{"ID":"51","NAME":"UNIT 37A"},{"ID":"52","NAME":"UNIT 38"},{"ID":"53","NAME":"UNIT 39"},{"ID":"54","NAME":"UNIT 40"},{"ID":"55","NAME":"UNIT 41"},{"ID":"56","NAME":"UNIT 42"},{"ID":"57","NAME":"UNIT 43"},{"ID":"58","NAME":"UNIT 44"},{"ID":"59","NAME":"UNIT 45"},{"ID":"60","NAME":"UNIT 46"},{"ID":"61","NAME":"UNIT 47"},{"ID":"62","NAME":"UNIT 48"},{"ID":"63","NAME":"UNIT 49"},{"ID":"64","NAME":"UNIT 50"},{"ID":"65","NAME":"UNIT 51"},{"ID":"66","NAME":"UNIT 52"},{"ID":"67","NAME":"UNIT 52A"},{"ID":"68","NAME":"UNIT 53"},{"ID":"69","NAME":"UNIT 54"},{"ID":"70","NAME":"UNIT 55"},{"ID":"71","NAME":"UNIT 56"},{"ID":"72","NAME":"UNIT 57"},{"ID":"73","NAME":"UNIT 58"},{"ID":"74","NAME":"UNIT 59"},{"ID":"75","NAME":"UNIT 59A"},{"ID":"76","NAME":"UNIT 60"},{"ID":"77","NAME":"UNIT 60A"},{"ID":"78","NAME":"UNIT 61"},{"ID":"79","NAME":"UNIT 62"},{"ID":"80","NAME":"UNIT 62A"},{"ID":"81","NAME":"UNIT 63"},{"ID":"82","NAME":"UNIT 63A"},{"ID":"83","NAME":"UNIT 64"},{"ID":"84","NAME":"UNIT 65"},{"ID":"85","NAME":"UNIT 66"},{"ID":"86","NAME":"UNIT 66A"},{"ID":"87","NAME":"UNIT 67"},{"ID":"88","NAME":"UNIT 68"},{"ID":"89","NAME":"UNIT 68A"},{"ID":"90","NAME":"UNIT 69"},{"ID":"91","NAME":"UNIT 70"},{"ID":"92","NAME":"UNIT 71"},{"ID":"93","NAME":"UNIT 72"},{"ID":"94","NAME":"UNIT 73"},{"ID":"95","NAME":"UNIT 73A"},{"ID":"96","NAME":"UNIT 74"},{"ID":"97","NAME":"UNIT 75"},{"ID":"98","NAME":"UNIT 76"},{"ID":"99","NAME":"UNIT 77"},{"ID":"100","NAME":"UNIT 78"},];
		$.each(gmuList, function(){
			$('#gmu').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		//populate the Elk Zone dropdown with JSON vars.
		var ElkZoneList = [{"ID":"93","NAME":"Bannock"},{"ID":"2","NAME":"Bear River"},{"ID":"3","NAME":"Beaverhead"},{"ID":"5","NAME":"Big Desert"},{"ID":"6","NAME":"Boise River"},{"ID":"7","NAME":"Brownlee"},{"ID":"8","NAME":"Diamond Creek"},{"ID":"9","NAME":"Dworshak"},{"ID":"10","NAME":"Elk City"},{"ID":"11","NAME":"Hells Canyon"},{"ID":"12","NAME":"Island Park"},{"ID":"13","NAME":"Lemhi"},{"ID":"14","NAME":"Lolo"},{"ID":"15","NAME":"McCall"},{"ID":"16","NAME":"Middle Fork"},{"ID":"52","NAME":"Owyhee"},{"ID":"18","NAME":"Palisades"},{"ID":"19","NAME":"Palouse"},{"ID":"20","NAME":"Panhandle"},{"ID":"21","NAME":"Pioneer"},{"ID":"22","NAME":"Salmon"},{"ID":"23","NAME":"Sawtooth"},{"ID":"24","NAME":"Selway"},{"ID":"4","NAME":"Smoky - Bennett"},{"ID":"26","NAME":"Snake River"},{"ID":"60","NAME":"South Hills"},{"ID":"28","NAME":"Tex Creek"},{"ID":"29","NAME":"Weiser River"},];
		$.each(ElkZoneList, function(){
			$('#elkzone').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		//populate the Waterfowl Hunt Areas dropdown with JSON vars.
		var waterfowlList = [{"ID":"1","NAME":"Canada Goose Area 1"},{"ID":"2","NAME":"Canada Goose Area 2"},{"ID":"3","NAME":"Canada Goose Area 3"},{"ID":"4","NAME":"Duck Area 1"},{"ID":"5","NAME":"Duck Area 2"},{"ID":"6","NAME":"Light Goose Area 1"},{"ID":"7","NAME":"Light Goose Area 2"},{"ID":"8","NAME":"Light Goose Area 3"},{"ID":"9","NAME":"White-fronted Goose Area 1"},{"ID":"10","NAME":"White-fronted Goose Area 2"},{"ID":"11","NAME":"Sandhill Crane Area 1"},{"ID":"12","NAME":"Sandhill Crane Area 2"},{"ID":"13","NAME":"Sandhill Crane Area 3"},{"ID":"14","NAME":"Sandhill Crane Area 4"},{"ID":"15","NAME":"Sandhill Crane Area 5"},];
		$.each(waterfowlList, function(){
			$('#waterfowl').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		//populate the Game Distribution dropdown with JSON vars.
		var gameAnimalList = [{"ID":"730","NAME":"American Badger"},{"ID":"693","NAME":"American Beaver"},{"ID":"362","NAME":"American Coot"},{"ID":"500","NAME":"American Crow"},{"ID":"723","NAME":"American Marten"},{"ID":"306","NAME":"American Wigeon"},{"ID":"318","NAME":"Barrow's Goldeneye"},{"ID":"719","NAME":"Black Bear"},{"ID":"301","NAME":"Blue-Winged Teal"},{"ID":"736","NAME":"Bobcat"},{"ID":"319","NAME":"Bufflehead"},{"ID":"747","NAME":"California Bighorn Sheep"},{"ID":"356","NAME":"California Quail"},{"ID":"295","NAME":"Canada Goose"},{"ID":"307","NAME":"Canvasback"},{"ID":"345","NAME":"Chukar"},{"ID":"302","NAME":"Cinnamon Teal"},{"ID":"352","NAME":"Columbian Sharp-Tailed Grouse"},{"ID":"317","NAME":"Common Goldeneye"},{"ID":"321","NAME":"Common Merganser"},{"ID":"722","NAME":"Common Raccoon"},{"ID":"397","NAME":"Common Snipe"},{"ID":"-700","NAME":"Deer"},{"ID":"348","NAME":"Dusky Grouse"},{"ID":"305","NAME":"Eurasian Wigeon"},{"ID":"304","NAME":"Gadwall"},{"ID":"344","NAME":"Gray Partridge"},{"ID":"310","NAME":"Greater Scaup"},{"ID":"297","NAME":"Green-Winged Teal"},{"ID":"313","NAME":"Harlequin Duck"},{"ID":"320","NAME":"Hooded Merganser"},{"ID":"311","NAME":"Lesser Scaup"},{"ID":"299","NAME":"Mallard"},{"ID":"727","NAME":"Mink"},{"ID":"740","NAME":"Moose"},{"ID":"656","NAME":"Mountain Cottontail"},{"ID":"745","NAME":"Mountain Goat"},{"ID":"734","NAME":"Mountain Lion"},{"ID":"746","NAME":"Mountain Sheep"},{"ID":"428","NAME":"Mourning Dove"},{"ID":"738","NAME":"Mule Deer"},{"ID":"708","NAME":"Muskrat"},{"ID":"354","NAME":"Northern Bobwhite"},{"ID":"300","NAME":"Northern Pintail"},{"ID":"733","NAME":"Northern River Otter"},{"ID":"303","NAME":"Northern Shoveler"},{"ID":"743","NAME":"Pronghorn"},{"ID":"660","NAME":"Pygmy Rabbit"},{"ID":"717","NAME":"Red Fox"},{"ID":"322","NAME":"Red-Breasted Merganser"},{"ID":"308","NAME":"Redhead"},{"ID":"309","NAME":"Ring-Necked Duck"},{"ID":"346","NAME":"Ring-Necked Pheasant"},{"ID":"293","NAME":"Ross's Goose"},{"ID":"323","NAME":"Ruddy Duck"},{"ID":"349","NAME":"Ruffed Grouse"},{"ID":"350","NAME":"Sage Grouse"},{"ID":"363","NAME":"Sandhill Crane"},{"ID":"292","NAME":"Snow Goose"},{"ID":"657","NAME":"Snowshoe Hare"},{"ID":"347","NAME":"Spruce Grouse"},{"ID":"737","NAME":"Wapiti Or Elk"},{"ID":"739","NAME":"White-Tailed Deer"},{"ID":"353","NAME":"Wild Turkey"},{"ID":"296","NAME":"Wood Duck"},];
		$.each(gameAnimalList, function(){
			$('#gameDistribution').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		// legend nav1 menu is selected
		$("#legendNav1").click(function(e){
			$("#legendCollapse").collapse('toggle');
		});
		//Close other tools when opened.
		$('#legendCollapse').on('show.bs.collapse', function(){
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// basemap nav 1 menu is selected
		$("#basemapNav1").click(function(e){
			$("#basemapCollapse").collapse('toggle');
		});
		//Close other tools when opened.
		$('#basemapCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");;
			$("#pdfCollapse").removeClass("in");
		});
		// hunt nav1 menu is selected
		$("#huntNav1").click(function(e){
			$("#huntCollapse").collapse('toggle');
		});
		//Close other tools when opened.
		$('#huntCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");		
		});
		// kml nav1 menu is selected
		$("#kmlNav1").click(function(e){
			$("#kmlCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#kmlCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// upload nav1 menu is selected
		$("#uploadNav1").click(function(e){
			$("#uploadCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#uploadCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// Geosearch nav1 menu is selected
		$("#geosearchNav1").click(function(e){
			$("#geosearchCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#geosearchCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
			// measurement nav1 menu is selected
		$("#measurementNav1").click(function(e){
			$("#measureCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#measureCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// draw nav1 menu is selected
		$("#drawNav1").click(function(e){
			$("#drawCollapse").collapse('toggle');  
		});
		//Close other tools when opened.
		$('#drawCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// pdf nav1 menu is selected
		$("#pdfNav1").click(function(e){
			$("#pdfCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#pdfCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
		});
		// help nav1 menu is selected
		$("#helpNav1").click(function(e){
			$("#helpModal").modal("show"); 

		});
		// disclaimer is clicked
		$("#disclaimer").click(function(e){
			$("#disclaimerModal").modal("show");
		});

		if ($(window).width() < 500) {
			collapse($("#sidebar"));
			$(".controlBtns").css({
				"width": "100%",
				"position": "fixed"
			});
			$("#ReturnBtn").show();
		} else {
			expand($("#sidebar"));
			$(".controlBtns").css({
				"width": "35%",
				"position": "relative"
			});
			$("#ReturnBtn").hide();
		}
	});
	
	var sidebar = $("#sidebar");
	$('#ReturnBtn').on("click", function() {
			collapse(sidebar);
	});
	
	$("#expandSidebar").on("click", function() {
		if (!$("#sidebar").hasClass("collapse")) {
				collapse(sidebar);
		} else {
				expand($(sidebar));
		}
	});

	$(window).on("resize", function() {
			if ($(this).width() < 500) {
				$(".controlBtns").css({
					"width": "100%",
					"position": "fixed"
				});
				$("#ReturnBtn").show();
				if (!$("#sidebar").hasClass("collapse")) {
						$("#mapView").css({
								"display": "none"
						});
				}
			} else {
				$('#ReturnBtn').hide();
				$(".controlBtns").css({
						"width": "35%",
						"position": "relative"
				});
				$("#mapView").css({
						"display": "block"
				});
			}
	});

	function collapse(el) {
			$(el).addClass("collapse");
			$("#mapView").addClass("fullScreen");
			$("#mapView").removeClass("splitScreen");
			$("#expandSidebar").addClass("glyphicon-chevron-right");
			$("#expandSidebar").removeClass("glyphicon-chevron-left");
			$("#mapView").css({
					"display": "block"
			});
	}

	function expand(el) {
			$(el).removeClass("collapse");
			$("#mapView").removeClass("fullScreen");
			$("#mapView").addClass("splitScreen");
			$("#expandSidebar").removeClass("glyphicon-chevron-right");
			$("#expandSidebar").addClass("glyphicon-chevron-left");
			if ($(window).width() < 500) {
					$("#mapView").css({
							"display": "none"
					});
			} else {
					$("#mapView").css({
							"display": "block"
					});
			}
	}
	
	//Keypress event to launch help document
	window.onkeydown = function(e) {
		if (e.keyCode === 112) {
			var win = window.open('https://fishandgame.idaho.gov/ifwis/huntplanner/mapcenter/HelpDocV2/IDFG%20Hunt%20Planner%20Map%20Center%20V2%20Help%20Documentation.html', '_blank');
			if (win) {
					//Browser has allowed it to be opened
					win.focus();
			} else {
					//Browser has blocked it
					alert('Please allow popups for this website');
			}
		}
	};		
})