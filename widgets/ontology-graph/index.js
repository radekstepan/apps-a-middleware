if (typeof window == 'undefined' || window === null) {
  require('prelude-ls').installPrelude(global);
} else {
  prelude.installPrelude(window);
}
/* See https://github.com/cpettitt/dagre/blob/master/demo/demo-d3.html */
(function(){
  var Service, ref$, rows, query, interop, interopMines, nonCuratedEvidenceCodes, nodePadding, minTicks, directTerms, getHomologyWhereClause, directHomologyTerms, allGoTerms, flatten, flatRows, allHomologyTerms, wholeGraphQ, countQuery, homologueQuery, fetchNames, doLine, spline, translateEdge, getNodeDragPos, toNodeId, addLabels, markReachable, unmark, onlyMarked, findRoots, growTree, allChildren, relationshipPalette, linkFill, linkStroke, termPalette, termColor, brighten, darken, BRIGHTEN, isRoot, isLeaf, getR, linkDistance, getCharge, markDepth, annotateForHeight, objectify, trimGraphToHeight, drawForce, drawPauseBtn, drawRelationshipLegend, linkSpline, drawCurve, stratify, centrify, unfix, renderForce, drawDag, makeGraph, doUpdate, renderDag, rowToNode, queryParams, currentSymbol, main, debugColors, sortOnX, sortOnY;
  Service = intermine.Service;
  ref$ = new Service({
    root: 'www.flymine.org/query'
  }), rows = ref$.rows, query = ref$.query;
  interop = [
    {
      taxonId: 4932,
      root: 'yeastmine.yeastgenome.org/yeastmine',
      name: 'SGD'
    }, {
      taxonId: 7955,
      root: 'zmine.zfin.org/zebrafishmine',
      name: 'ZFin'
    }, {
      taxonId: 10090,
      root: 'http://www.mousemine.org/mousemine',
      name: 'MGI'
    }, {
      taxonId: 10116,
      root: 'http://ratmine.mcw.edu/ratmine',
      name: 'RGD'
    }
  ];
  interopMines = listToObj(map(function(arg$){
    var root, taxonId;
    root = arg$.root, taxonId = arg$.taxonId;
    return [
      taxonId, new Service({
        root: root
      })
    ];
  }, interop));
  nonCuratedEvidenceCodes = ['IBA', 'IBD', 'IEA', 'IGC', 'IKR', 'ISA', 'ISO', 'ISS', 'RCA'];
  nodePadding = 10;
  minTicks = 25;
  directTerms = function(it){
    return {
      select: ['goAnnotation.ontologyTerm.identifier'],
      from: 'Gene',
      where: {
        symbol: [it]
      }
    };
  };
  getHomologyWhereClause = function(genes){
    return {
      primaryIdentifier: genes,
      'goAnnotation.evidence.code.code': {
        'NONE OF': nonCuratedEvidenceCodes
      }
    };
  };
  directHomologyTerms = function(genes){
    return {
      select: ['goAnnotation.ontologyTerm.identifier'],
      from: 'Gene',
      where: getHomologyWhereClause(genes)
    };
  };
  allGoTerms = function(symbol){
    return {
      name: 'ALL-TERMS',
      select: ['goAnnotation.ontologyTerm.identifier', 'goAnnotation.ontologyTerm.parents.identifier'],
      from: 'Gene',
      where: {
        symbol: symbol
      }
    };
  };
  flatten = concatMap(id);
  flatRows = curry$(function(getRows, q){
    return getRows(q).then(compose$([unique, flatten]));
  });
  allHomologyTerms = function(children){
    return {
      name: 'ALL-HOMOLOGY',
      select: ['parents.identifier'],
      from: 'OntologyTerm',
      where: {
        identifier: children
      }
    };
  };
  wholeGraphQ = function(terms){
    return {
      name: 'EDGES',
      select: ['childTerm.identifier', 'relationship', 'parentTerm.identifier'],
      from: 'OntologyRelation',
      where: {
        'childTerm.identifier': terms,
        direct: 'true'
      }
    };
  };
  countQuery = function(terms){
    return {
      select: ['symbol'],
      from: 'Gene',
      where: {
        'goAnnotation.ontologyTerm.parents.identifier': terms
      }
    };
  };
  homologueQuery = curry$(function(symbol, targetOrganism){
    return {
      select: ['homologues.homologue.primaryIdentifier'],
      from: 'Gene',
      where: {
        symbol: [symbol],
        "homologues.homologue.organism.taxonId": targetOrganism
      }
    };
  });
  fetchNames = curry$(function(getRows, identifier){
    var q;
    q = {
      select: ['identifier', 'name'],
      from: 'OntologyTerm',
      where: {
        identifier: identifier
      }
    };
    return getRows(q).then(compose$([
      listToObj, map(function(arg$){
        var id, label;
        id = arg$[0], label = arg$[1];
        return [
          id, {
            label: label,
            id: id,
            edges: []
          }
        ];
      })
    ]));
  });
  doLine = d3.svg.line().x(function(it){
    return it.x;
  }).y(function(it){
    return it.y;
  }).interpolate('bundle');
  spline = function(arg$){
    var source, target, points, p0, pN;
    source = arg$.source.dagre, target = arg$.target.dagre, points = arg$.dagre.points;
    p0 = {
      x: source.x + source.width / 2,
      y: source.y
    };
    pN = {
      x: target.x - 15 - target.width / 2,
      y: target.y
    };
    return doLine([p0].concat(points, [pN]));
  };
  translateEdge = curry$(function(svg, e, dx, dy){
    var i$, ref$, len$, p, results$ = [];
    for (i$ = 0, len$ = (ref$ = e.dagre.points).length; i$ < len$; ++i$) {
      p = ref$[i$];
      p.x = p.x + dx;
      results$.push(p.y = p.y + dy);
    }
    return results$;
  });
  getNodeDragPos = function(posProp){
    return function(){
      return d3.event[posProp];
    };
  };
  toNodeId = compose$([
    (function(it){
      return 'node' + it;
    }), function(it){
      return it.replace(/:/g, '_');
    }, function(it){
      return it.id;
    }
  ]);
  addLabels = function(selection){
    var x$, labelG;
    x$ = labelG = selection.append('g');
    x$.attr('class', 'label');
    x$.append('rect');
    x$.append('text');
    labelG.each(function(d){
      var ref$;
      d.bbox = this.getBBox();
      if ((ref$ = d.label) != null && ref$.length) {
        d.width = d.bbox.width + 2 * nodePadding;
        return d.height = d.bbox.height + 2 * nodePadding;
      } else {
        return d.width = d.height = 0;
      }
    });
    labelG.select('text').attr('text-anchor', 'left').append('tspan').attr('dy', '1em').text(function(it){
      return it.label;
    });
    labelG.attr('dx', function(arg$){
      var points;
      points = arg$.dagre.points;
      return mean(map(function(it){
        return it.x;
      }, points));
    }).attr('dy', function(arg$){
      var points;
      points = arg$.dagre.points;
      return mean(map(function(it){
        return it.y;
      }, points));
    }).attr('width', function(it){
      return it.width;
    }).attr('height', function(it){
      return it.height;
    });
    return labelG.attr('transform', function(arg$){
      var points, x, y;
      points = arg$.dagre.points;
      x = mean(map(function(it){
        return it.x;
      }, points));
      y = mean(map(function(it){
        return it.y;
      }, points));
      return "translate(" + x + "," + y + ")";
    });
  };
  function mvTowards(howMuch, goal, n){
    var scale, dx, dy;
    scale = (function(it){
      return it * howMuch;
    });
    dx = scale(goal.x - n.x);
    dy = scale(goal.y - n.y);
    n.x += dx;
    n.y += dy;
  }
  markReachable = function(node){
    var queue, moar, n, results$ = [];
    node.isFocus = true;
    queue = [node];
    moar = function(n){
      return reject((function(it){
        return it === n;
      }), map(function(it){
        return it.target;
      }, n.edges));
    };
    while (n = queue.shift()) {
      n.isReachable = true;
      results$.push(each(bind$(queue, 'push'), moar(n)));
    }
    return results$;
  };
  unmark = function(nodes){
    var i$, len$, n, results$ = [];
    for (i$ = 0, len$ = nodes.length; i$ < len$; ++i$) {
      n = nodes[i$];
      n.isReachable = false;
      n.isFocus = false;
      n.isSource = false;
      results$.push(n.isTarget = false);
    }
    return results$;
  };
  onlyMarked = function(nodes, edges){
    return {
      nodes: filter(function(it){
        return it.isReachable;
      }, nodes),
      edges: filter(compose$([
        function(it){
          return it.isReachable;
        }, function(it){
          return it.source;
        }
      ]), edges)
    };
  };
  findRoots = function(arg$){
    var nodes, i$, len$, n, results$ = [];
    nodes = arg$.nodes;
    for (i$ = 0, len$ = nodes.length; i$ < len$; ++i$) {
      n = nodes[i$];
      if (all(compose$([(fn$), fn1$]), n.edges)) {
        results$.push(n);
      }
    }
    return results$;
    function fn$(it){
      return it === n;
    }
    function fn1$(it){
      return it.source;
    }
  };
  growTree = function(arg$){
    var id, label, edges, tn, i$, ref$, len$, e, x$, branch;
    id = arg$.id, label = arg$.label, edges = arg$.edges;
    tn = {
      id: id,
      label: label,
      children: []
    };
    tn.nodeType = 'root';
    for (i$ = 0, len$ = (ref$ = reject(compose$([(fn$), fn1$, fn2$]), edges)).length; i$ < len$; ++i$) {
      e = ref$[i$];
      x$ = branch = growTree(e.target);
      x$.nodeType = 'branch';
      x$.parent = tn;
      x$.relationship = e.label;
      tn.children.push(branch);
    }
    return tn;
    function fn$(it){
      return it === id;
    }
    function fn1$(it){
      return it.id;
    }
    function fn2$(it){
      return it.target;
    }
  };
  allChildren = function(tree){
    var children, queue, c, key$, i$, ref$, len$, gc;
    children = {};
    queue = [tree];
    while (c = queue.shift()) {
      children[key$ = c.id] == null && (children[key$] = c);
      for (i$ = 0, len$ = (ref$ = c.children).length; i$ < len$; ++i$) {
        gc = ref$[i$];
        queue.push(gc);
      }
    }
    return values(children);
  };
  function markSubtree(root, prop, val){
    var queue, moar, n;
    queue = [root];
    moar = function(arg$){
      var edges;
      edges = arg$.edges;
      return reject(compose$([
        (function(it){
          return it === val;
        }), function(it){
          return it[prop];
        }
      ]))(
      map(function(it){
        return it.source;
      }, edges));
    };
    while (n = queue.shift()) {
      n[prop] = val;
      each(bind$(queue, 'push'), moar(n));
    }
    return root;
  }
  relationshipPalette = d3.scale.category10();
  linkFill = compose$([
    relationshipPalette, function(it){
      return it.label;
    }
  ]);
  linkStroke = compose$([
    function(it){
      return it.darker();
    }, bind$(d3, 'rgb'), linkFill
  ]);
  termPalette = d3.scale.category20();
  termColor = compose$([
    function(it){
      return it.darker();
    }, bind$(d3, 'rgb'), termPalette, function(it){
      return it.id;
    }, function(it){
      return it.root;
    }
  ]);
  brighten = compose$([
    function(it){
      return it.brighter();
    }, bind$(d3, 'rgb')
  ]);
  darken = compose$([
    function(it){
      return it.darker();
    }, bind$(d3, 'rgb')
  ]);
  BRIGHTEN = compose$([brighten, brighten]);
  isRoot = function(it){
    return it.isRoot;
  };
  isLeaf = function(it){
    return it.isLeaf;
  };
  getR = function(it){
    return (1.5 * ln(it.count) + 5) * (it.marked ? 2 : 1);
  };
  linkDistance = function(arg$){
    var source, target, ns, edges, markedBump, mutedPenalty, radii;
    source = arg$.source, target = arg$.target;
    ns = [source, target];
    edges = sum(map(function(it){
      var ref$;
      return ((ref$ = it.edges) != null ? ref$.length : void 8) || 0;
    }, ns));
    markedBump = 50 * length(filter(function(it){
      return it.marked;
    }, ns));
    mutedPenalty = any(function(it){
      return it.muted;
    }, ns) ? 100 : 0;
    radii = sum(map(getR, ns));
    return 3 * edges + radii + 50 + markedBump - mutedPenalty;
  };
  getCharge = function(d){
    var radius, rootBump, edgeBump, markedBump, jiggleBump, k;
    radius = getR(d);
    rootBump = isRoot(d) ? 150 : 0;
    edgeBump = 10 * d.edges.length;
    markedBump = d.marked ? 2 : 1;
    jiggleBump = queryParams.jiggle === 'strata' ? 20 : 0;
    k = 150;
    return 1 - (k + radius + rootBump + edgeBump) * markedBump;
  };
  markDepth = function(node, depthAtNode, maxDepth){
    var nextDepth, i$, ref$, len$, target, results$ = [];
    node.depths.push(depthAtNode);
    nextDepth = depthAtNode + 1;
    if (nextDepth > maxDepth) {
      return;
    }
    for (i$ = 0, len$ = (ref$ = map(fn$, node.edges)).length; i$ < len$; ++i$) {
      target = ref$[i$];
      if (node !== target) {
        results$.push(markDepth(target, nextDepth, maxDepth));
      }
    }
    return results$;
    function fn$(it){
      return it.target;
    }
  };
  annotateForHeight = function(nodes, level){
    var leaves, i$, len$, leaf;
    level == null && (level = 50);
    leaves = filter(function(it){
      return it.isDirect;
    }, map((function(it){
      return it.depths = [], it;
    }), nodes));
    for (i$ = 0, len$ = leaves.length; i$ < len$; ++i$) {
      leaf = leaves[i$];
      markDepth(leaf, 0, level);
    }
    return each(function(it){
      return it.stepsFromLeaf = minimum(it.depths), it;
    }, nodes);
  };
  objectify = function(key, value){
    return compose$([
      listToObj, map(function(it){
        return [key(it), value(it)];
      })
    ]);
  };
  trimGraphToHeight = function(arg$, level){
    var nodes, edges, f, filtered, i$, ref$, len$, n, elision;
    nodes = arg$.nodes, edges = arg$.edges;
    if (!level) {
      return {
        nodes: nodes,
        edges: edges
      };
    }
    console.log("Trimming graph to " + level);
    f = compose$([
      (function(it){
        return it <= level;
      }), function(it){
        return it.stepsFromLeaf;
      }
    ]);
    filtered = {
      nodes: filter(f, nodes),
      edges: filter(function(it){
        return all(f, [it.source, it.target]);
      }, edges)
    };
    console.log(filtered.nodes.length, nodes.length);
    each(bind$(filtered.nodes, 'push'), filter(isRoot, nodes));
    for (i$ = 0, len$ = (ref$ = filtered.nodes).length; i$ < len$; ++i$) {
      n = ref$[i$];
      if (!n.isRoot && any(compose$([not$, f]), map(fn$, n.edges))) {
        elision = {
          source: n,
          target: n.root,
          label: 'elision'
        };
        filtered.edges.push(elision);
      }
    }
    console.log("Down to " + length(filtered.edges) + ", " + function(it){
      return it.toFixed(2);
    }(filtered.edges.length / edges.length * 100) + "% of the original number of edges");
    return filtered;
    function fn$(it){
      return it.target;
    }
  };
  drawForce = function(directNodes, edges, nodeForIdent, symbol){
    var graph, allNodes, allEdges, state, elideGraph, x$, rootSelector, y$, elisionSelector, getHomologues, i$, ref$, len$, n, roots, r;
    graph = makeGraph.apply(this, arguments);
    allNodes = graph.nodes.slice();
    allEdges = graph.edges.slice();
    state = new Backbone.Model({
      symbol: symbol,
      smallGraphThreshold: 20,
      animating: 'waiting',
      root: null,
      jiggle: queryParams.jiggle || 'centre',
      spline: queryParams.spline || 'curved',
      graph: graph,
      maxmarked: 20,
      zoom: 1,
      translate: [5, 5],
      dimensions: {
        w: $('body').width(),
        h: $('body').height()
      },
      elision: queryParams.elision ? +queryParams.elision : null,
      relationships: sort(unique(map(function(it){
        return it.label;
      }, allEdges))).concat(['elision'])
    });
    elideGraph = function(s, level){
      var currentRoot, nodes, edges;
      console.log("Eliding graph to " + level);
      currentRoot = s.get('root');
      nodes = (function(){
        switch (false) {
        case !currentRoot:
          return filter(compose$([
            (function(it){
              return it === currentRoot;
            }), function(it){
              return it.root;
            }
          ]), allNodes);
        default:
          return allNodes.slice();
        }
      }());
      edges = (function(){
        switch (false) {
        case !currentRoot:
          return filter(compose$([
            (function(it){
              return it === currentRoot;
            }), function(it){
              return it.root;
            }, function(it){
              return it.target;
            }
          ]), allEdges);
        default:
          return allEdges.slice();
        }
      }());
      return s.set('graph', trimGraphToHeight({
        nodes: nodes,
        edges: edges
      }, level));
    };
    state.on('change:elision', elideGraph);
    query(
    countQuery(
    keys(
    nodeForIdent))).then(function(it){
      return it.summarise('goAnnotation.ontologyTerm.parents.identifier');
    }).then(objectify(function(it){
      return it.item;
    }, function(it){
      return it.count;
    })).then(function(summary){
      return each(function(it){
        return it.count = summary[it.id];
      }, allNodes);
    });
    $('.graph-control').show().on('submit', function(it){
      return it.preventDefault();
    }).find('.resizer').click(function(){
      return $(this).toggleClass('icon-resize-small icon-resize-full').siblings('.hidable').slideToggle();
    });
    $('#jiggle').val(state.get('jiggle')).on('change', function(){
      return state.set('jiggle', $(this).val());
    });
    state.on('change:jiggle', flip(bind$($('#jiggle'), 'val')));
    $('#spline').val(state.get('spline')).on('change', function(){
      return state.set('spline', $(this).val());
    });
    state.on('change:spline', flip(bind$($('#spline'), 'val')));
    $('#force-reset').on('click', function(){
      return state.trigger('graph:reset');
    });
    x$ = rootSelector = $('#graph-root');
    x$.on('change', function(){
      state.set('root', nodeForIdent[$(this).val()]);
    });
    state.on('change:root', function(s, root){
      switch (false) {
      case !root:
        return rootSelector.val(root.id);
      default:
        return rootSelector.val('null');
      }
    });
    state.on('change:root', function(s, currentRoot){
      var nodes, edges, level, graph;
      if (currentRoot) {
        console.log("Filtering to " + currentRoot.label);
        nodes = filter(compose$([
          (function(it){
            return it === currentRoot;
          }), function(it){
            return it.root;
          }
        ]), allNodes);
        edges = filter(compose$([
          (function(it){
            return it === currentRoot;
          }), function(it){
            return it.root;
          }, function(it){
            return it.target;
          }
        ]), allEdges);
      } else {
        nodes = allNodes.slice();
        edges = allEdges.slice();
      }
      level = state.get('elision');
      graph = (function(){
        switch (false) {
        case !(level && any(function(it){
          return it.stepsFromLeaf;
        }, nodes)):
          return trimGraphToHeight({
            nodes: nodes,
            edges: edges
          }, level);
        default:
          return {
            nodes: nodes,
            edges: edges
          };
        }
      }());
      return state.set('graph', graph);
    });
    y$ = elisionSelector = $('#elision');
    y$.on('change', function(){
      return state.set('elision', parseInt($(this).val(), 10));
    });
    state.on('change:elision', flip(bind$(elisionSelector, 'val')));
    setTimeout(function(){
      var heights, i$, len$, h, text, level;
      annotateForHeight(allNodes);
      heights = sort(unique(map(function(it){
        return it.stepsFromLeaf;
      }, allNodes)));
      for (i$ = 0, len$ = heights.length; i$ < len$; ++i$) {
        h = heights[i$];
        text = (fn$());
        elisionSelector.append("<option value=\"" + h + "\">" + text + "</option>");
      }
      state.trigger('controls:changed');
      if (level = state.get('elision')) {
        elisionSelector.val(level);
        return elideGraph(state, level);
      }
      function fn$(){
        switch (h) {
        case 0:
          return "Show all terms";
        case 1:
          return "Show only direct parents of annotations, and the root term";
        default:
          return "show all terms within " + h + " steps of a directly annotated term";
        }
      }
    }, 0);
    setUpOntologyTable();
    setUpInterop();
    getHomologues = homologueQuery(symbol);
    state.on('graph:marked', showOntologyTable);
    state.on('change:graph', renderForce);
    state.on('controls:changed', function(){
      return $(document).foundation();
    });
    for (i$ = 0, len$ = (ref$ = graph.nodes).length; i$ < len$; ++i$) {
      n = ref$[i$];
      n.count = 1;
    }
    roots = filter(isRoot, allNodes);
    for (i$ = 0, len$ = (ref$ = roots.concat([{
      id: 'null',
      label: "All"
    }])).length; i$ < len$; ++i$) {
      r = ref$[i$];
      rootSelector.append("<option value=\"" + r.id + "\">" + r.label + "</option>");
    }
    state.trigger('controls:changed');
    if (queryParams.allRoots) {
      renderForce(state, graph);
    } else {
      state.set('root', roots[0]);
    }
    function setUpInterop(){
      var $ul, toOption;
      $ul = $('#interop-sources');
      toOption = function(group){
        var $li;
        $li = $("<li><a href=\"#\" class=\"small button\">" + group.name + "</a></li>");
        return $li.on('click', function(){
          return addHomologues(group.taxonId);
        });
      };
      return each(bind$($ul, 'append'), map(toOption, interop));
    }
    function addHomologues(source){
      var service, rs, gettingHomologues, gettingDirect, gettingAll, gettingNames, gettingEdges, makingGraph;
      service = interopMines[source];
      rs = flatRows(bind$(service, 'rows'));
      gettingHomologues = flatRows(rows)(
      getHomologues(source));
      gettingDirect = gettingHomologues.then(compose$([rs, directHomologyTerms]));
      gettingAll = gettingDirect.then(compose$([rs, allHomologyTerms]));
      gettingNames = gettingAll.then(fetchNames(bind$(service, 'rows')));
      gettingEdges = gettingAll.then(compose$([bind$(service, 'rows'), wholeGraphQ])).then(map(rowToNode));
      makingGraph = function(it){
        return it.then(makeGraph);
      }($.when(gettingDirect, gettingEdges, gettingNames));
      return makingGraph.done(function(g){
        return console.log(g);
      });
    }
    function setUpOntologyTable(){
      var ref$, w, h, getLeft, x$, table;
      ref$ = state.get('dimensions'), w = ref$.w, h = ref$.h;
      getLeft = function(isOpen){
        switch (false) {
        case !isOpen:
          return w - 50;
        default:
          return w - 60 - $('#ontology-table .marked-terms').outerWidth();
        }
      };
      x$ = table = $('#ontology-table');
      x$.css({
        top: 0.05 * h,
        left: getLeft(true),
        height: 0.9 * h,
        width: 0.6 * w
      });
      return table.find('.slide-control').on('click', function(){
        var wasOpen, x$, icon;
        wasOpen = table.hasClass('open');
        table.toggleClass('open').animate({
          left: getLeft(wasOpen)
        });
        x$ = icon = $('i', this);
        x$.removeClass('icon-chevron-right icon-chevron-left');
        x$.addClass(wasOpen ? 'icon-chevron-left' : 'icon-chevron-right');
        return x$;
      });
    }
    function showOntologyTable(){
      var ref$, w, h, markedStatements, evt, toRow, x$, $tbl;
      ref$ = state.get('dimensions'), w = ref$.w, h = ref$.h;
      markedStatements = filter(compose$([
        function(it){
          return it.marked;
        }, function(it){
          return it.source;
        }
      ]))(
      function(it){
        return it.edges;
      }(
      state.get('graph')));
      evt = 'relationship:highlight';
      toRow = function(link){
        var $row;
        $row = $("<tr>\n    <td>" + link.source.label + "</td>\n    <td>" + link.label + "</td>\n    <td>" + link.target.label + "</td>\n</tr>");
        return $row.on('mouseout', function(){
          $row.toggleClass('highlit', false);
          return state.trigger(evt, null);
        }).on('mouseover', function(){
          $row.toggleClass('highlit', true);
          return state.trigger(evt, link);
        });
      };
      x$ = $tbl = $('#ontology-table .marked-terms');
      x$.find('tbody').empty();
      each(bind$($tbl, 'append'), map(toRow, markedStatements));
      return $('#ontology-table').toggle(markedStatements.length > 0);
    }
    return showOntologyTable;
  };
  drawPauseBtn = curry$(function(dimensions, state, svg){
    var ref$, cx, cy, radius, x, y, btn, drawPauseBars, symbolLine, toRadians, drawPlaySymbol;
    ref$ = map((function(it){
      return it * 0.9;
    }), [dimensions.w, dimensions.h]), cx = ref$[0], cy = ref$[1];
    radius = 0.075 * dimensions.h;
    ref$ = map((function(it){
      return it - radius;
    }), [cx, cy]), x = ref$[0], y = ref$[1];
    svg.selectAll('g.btn').remove();
    btn = svg.append('g').attr('class', 'btn').attr('x', x).attr('y', y);
    btn.append('circle').attr('r', radius).attr('cx', cx).attr('cy', cy).attr('stroke', 'black').attr('stroke-width', 5).attr('fill', '#ccc').attr('opacity', 0.2);
    drawPauseBars = function(){
      var pauseBar, i$, ref$, len$, f, results$ = [];
      btn.selectAll('path.play-symbol').remove();
      pauseBar = {
        width: 0.025 * dimensions.h,
        height: 0.08 * dimensions.h
      };
      for (i$ = 0, len$ = (ref$ = [-1.2, 0.2]).length; i$ < len$; ++i$) {
        f = ref$[i$];
        results$.push(btn.append('rect').attr('class', 'pause-bar').attr('width', pauseBar.width).attr('x', cx + f * pauseBar.width).attr('height', pauseBar.height).attr('y', cy - pauseBar.height / 2).attr('fill', '#555').attr('opacity', 0.2));
      }
      return results$;
    };
    symbolLine = d3.svg.line().x(function(arg$){
      var r, a;
      r = arg$[0], a = arg$[1];
      return cx + r * cos(a);
    }).y(function(arg$){
      var r, a;
      r = arg$[0], a = arg$[1];
      return cy + r * sin(a);
    }).interpolate('linear');
    toRadians = (function(it){
      return it * Math.PI / 180;
    });
    drawPlaySymbol = function(){
      var innerR, points, res$, i$, ref$, len$, angle;
      btn.selectAll('.pause-bar').remove();
      innerR = 0.75 * radius;
      res$ = [];
      for (i$ = 0, len$ = (ref$ = [0, 120, 240]).length; i$ < len$; ++i$) {
        angle = ref$[i$];
        res$.push([innerR, toRadians(angle)]);
      }
      points = res$;
      return btn.append('path').attr('class', 'play-symbol').attr('fill', '#555').attr('opacity', 0.2).attr('d', (function(it){
        return it + 'Z';
      })(symbolLine(points)));
    };
    drawPlaySymbol();
    state.on('change:animating', function(s, currently){
      switch (currently) {
      case 'paused':
        return drawPlaySymbol();
      case 'running':
        return drawPauseBars();
      }
    });
    return btn.on('click', function(){
      switch (state.get('animating')) {
      case 'paused':
        return state.set({
          animating: 'running'
        });
      case 'running':
        return state.set({
          animating: 'paused'
        });
      }
    });
  });
  drawRelationshipLegend = curry$(function(state, palette, svg){
    var ref$, dimensions, relationships, height, padding, width, getX, getY, legend, lg;
    ref$ = state.toJSON(), dimensions = ref$.dimensions, relationships = ref$.relationships;
    height = 50;
    padding = 25;
    width = dimensions.h > dimensions.w ? (dimensions.w - padding * 2) / relationships.length : 180;
    ref$ = (function(){
      switch (false) {
      case !(dimensions.h > dimensions.w):
        return [
          flip(function(it){
            return padding + width * it;
          }), function(){
            return padding;
          }
        ];
      default:
        return [
          function(){
            return padding;
          }, flip(function(it){
            return padding + height * it;
          })
        ];
      }
    }()), getX = ref$[0], getY = ref$[1];
    legend = svg.selectAll('g.legend').data(relationships);
    lg = legend.enter().append('g').attr('class', 'legend').attr('width', width).attr('height', height).attr('x', getX).attr('y', getY).on('mouseover', function(d, i){
      state.trigger('relationship:highlight', d);
      return d3.select(this).selectAll('rect').attr('fill', compose$([brighten, palette]));
    }).on('mouseout', function(){
      state.trigger('relationship:highlight', null);
      return d3.select(this).selectAll('rect').attr('fill', palette);
    }).on('click', function(rel){
      var i$, ref$, len$, e, j$, ref1$, len1$, n;
      for (i$ = 0, len$ = (ref$ = state.get('graph').edges).length; i$ < len$; ++i$) {
        e = ref$[i$];
        if (e.label === rel) {
          for (j$ = 0, len1$ = (ref1$ = [e.source, e.target]).length; j$ < len1$; ++j$) {
            n = ref1$[j$];
            n.marked = true;
          }
        }
      }
      return state.trigger('nodes:marked');
    });
    legend.exit().remove();
    lg.append('rect').attr('opacity', 0.6).attr('width', width).attr('height', height).attr('x', getX).attr('y', getY).attr('fill', palette);
    return lg.append('text').attr('x', getX).attr('y', getY).attr('dy', height / 2).attr('dx', '0.5em').text(id);
  });
  linkSpline = curry$(function(offsetScale, args){
    var source, target, lineLength, endPoint, radiusS, cos90, sin90, meanX, meanY, offset, mp1X, mp1Y, mp2X, mp2Y;
    source = args[0], target = args[1], lineLength = args[2], endPoint = args[3], radiusS = args[4], cos90 = args[5], sin90 = args[6];
    meanX = mean(map(function(it){
      return it.x;
    }, [source, target]));
    meanY = mean(map(function(it){
      return it.y;
    }, [source, target]));
    offset = offsetScale * lineLength - radiusS / 4;
    mp1X = meanX + offset * cos90;
    mp1Y = meanY + offset * sin90;
    mp2X = meanX + offset * cos90;
    mp2Y = meanY + offset * sin90;
    return [[source.x - radiusS * 0.9 * cos90, source.y - radiusS * 0.9 * sin90], [mp2X, mp2Y], endPoint, endPoint, [mp1X, mp1Y], [source.x + radiusS * 0.9 * cos90, source.y + radiusS * 0.9 * sin90]];
  });
  drawCurve = (function(line){
    return function(arg$){
      var target, source, cos, sin, sqrt, atan2, pow, PI, slope, ref$, sinS, cosS, slopePlus90, sin90, cos90, radiusT, radiusS, lineLength, endPoint, args;
      target = arg$.target, source = arg$.source;
      cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt, atan2 = Math.atan2, pow = Math.pow, PI = Math.PI;
      slope = atan2(target.y - source.y, target.x - source.x);
      ref$ = map(function(it){
        return it(slope);
      }, [sin, cos]), sinS = ref$[0], cosS = ref$[1];
      slopePlus90 = PI / 2 + slope;
      ref$ = map(function(it){
        return it(slopePlus90);
      }, [sin, cos]), sin90 = ref$[0], cos90 = ref$[1];
      ref$ = map(getR, [target, source]), radiusT = ref$[0], radiusS = ref$[1];
      lineLength = sqrt(pow(target.x - source.x, 2) + pow(target.y - source.y, 2));
      endPoint = [target.x - radiusT * 0.9 * cosS, target.y - radiusT * 0.9 * sinS];
      args = [source, target, lineLength, endPoint, radiusS, cos90, sin90];
      return (function(it){
        return it + 'Z';
      })(
      line(
      linkSpline(0.1)(
      args)));
    };
  }.call(this, d3.svg.line().interpolate('basis')));
  stratify = (function(sortX){
    return function(state){
      var ref$, dimensions, graph, zoom, currentFontSize, roots, leaves, surface, widthRange, corners, quantile, i$, len$, n;
      ref$ = state.toJSON(), dimensions = ref$.dimensions, graph = ref$.graph, zoom = ref$.zoom;
      currentFontSize = Math.min(40, 20 / zoom);
      roots = sortX(filter(isRoot, graph.nodes));
      leaves = sortX(filter(function(it){
        return it.isDirect && it.isLeaf;
      }, graph.nodes));
      surface = fold(min, 0, map(function(it){
        return it.y;
      }, graph.nodes));
      widthRange = d3.scale.linear().range([0.1 * dimensions.w, 0.9 * dimensions.w]).domain([0, leaves.length - 1]);
      corners = d3.scale.quantile().domain([0, dimensions.w]).range([0, dimensions.w]);
      quantile = (function(){
        switch (false) {
        case !!roots.length:
          return function(){
            return dimensions.w / 2;
          };
        default:
          return d3.scale.quantile().domain([0, dimensions.w]).range((function(){
            var i$, to$, results$ = [];
            for (i$ = 0, to$ = roots.length; i$ < to$; ++i$) {
              results$.push(i$);
            }
            return results$;
          }()));
        }
      }());
      roots.forEach(function(root, i){
        root.fixed = false;
        return mvTowards(0.01, {
          y: surface - getR(root),
          x: root.x
        }, root);
      });
      for (i$ = 0, len$ = (ref$ = graph.nodes).length; i$ < len$; ++i$) {
        n = ref$[i$];
        if (!n.isRoot && n.y + getR(n) < surface) {
          mvTowards(0.001, {
            x: n.root.x,
            y: dimensions.h
          }, n);
        }
      }
      return leaves.forEach(function(n, i){
        var speed;
        speed = n.y < dimensions.h / 2 ? 0.05 : 0.005;
        if (n.y < dimensions.h * 0.9) {
          mvTowards(speed, {
            x: widthRange(i),
            y: dimensions.h * 0.9
          }, n);
        }
        if (n.y >= dimensions.h * 0.85) {
          return n.y = dimensions.h * 0.9 + currentFontSize * 1.1 * i;
        }
      });
    };
  }.call(this, sortBy(compare(function(it){
    return it.x;
  }))));
  centrify = function(state){
    var ref$, graph, dimensions, roots, meanD, half, centre, i$, len$, leaf, results$ = [];
    ref$ = state.toJSON(), graph = ref$.graph, dimensions = ref$.dimensions;
    roots = sortBy(compare(function(it){
      return it.y;
    }), filter(isRoot, graph.nodes));
    meanD = mean(map(compose$([
      (function(it){
        return it * 2;
      }), getR
    ]), roots));
    half = (function(it){
      return it / 2;
    });
    if (roots.length === 1) {
      ref$ = roots[0];
      ref$.x = half(dimensions.w);
      ref$.y = half(dimensions.h);
      ref$.fixed = true;
    } else {
      roots.forEach(function(n, i){
        var goal;
        goal = {
          x: half(dimensions.w),
          y: half(dimensions.h) - meanD * roots.length / 2 + meanD * i
        };
        mvTowards(0.05, goal, n);
      });
    }
    centre = {
      x: half(dimensions.w),
      y: half(dimensions.h)
    };
    for (i$ = 0, len$ = (ref$ = graph.nodes).length; i$ < len$; ++i$) {
      leaf = ref$[i$];
      if (isLeaf(leaf)) {
        results$.push(mvTowards(-0.0005, centre, leaf));
      }
    }
    return results$;
  };
  unfix = function(state){
    each((function(it){
      return it.fixed = false, it;
    }))(
    filter(isRoot)(
    function(it){
      return it.nodes;
    }(
    state.get('graph'))));
  };
  renderForce = function(state, graph){
    var dimensions, force, svg, throbber, getLabelFontSize, zoom, relationships, svgGroup, link, getLabelId, node, nG, texts, tickCount, getMinMaxSize;
    if (graph.edges.length > 250 && !state.has('elision')) {
      return state.set({
        elision: 2
      });
    }
    dimensions = state.get('dimensions');
    force = d3.layout.force().size([dimensions.w, dimensions.h]).charge(getCharge).gravity(0.04).linkStrength(0.8).linkDistance(linkDistance);
    state.on('change:spline', function(){
      return state.set({
        animating: 'running'
      });
    });
    state.on('change:jiggle', function(){
      return state.set({
        animating: 'running'
      });
    });
    state.on('graph:reset', unmark);
    window.force = force;
    state.on('change:animating', function(){
      var currently;
      currently = state.get('animating');
      switch (currently) {
      case 'running':
        force.resume();
        break;
      case 'paused':
        force.stop();
      }
    });
    svg = d3.select('svg');
    svg.selectAll('g.ontology').remove();
    svg.selectAll('g.root-label').remove();
    throbber = svg.append('use').attr('x', dimensions.w / 2 - 150).attr('y', dimensions.h / 2 - 150).attr('xlink:href', '#throbber');
    state.on('change:translate', function(s, currentTranslation){
      svgGroup.attr('transform', "translate(" + currentTranslation + ") scale(" + s.get('zoom') + ")");
      return force.tick();
    });
    state.on('change:zoom', function(s, currentZoom){
      svgGroup.attr('transform', "translate(" + s.get('translate') + ") scale(" + currentZoom + ")");
      return force.tick();
    });
    getLabelFontSize = function(){
      return Math.min(40, 20 / state.get('zoom'));
    };
    zoom = d3.behavior.zoom().scale(state.get('zoom')).on('zoom', function(){
      return state.set({
        zoom: d3.event.scale,
        translate: d3.event.translate.slice()
      });
    });
    svg.call(zoom);
    relationships = state.get('relationships');
    svg.attr('width', dimensions.w).attr('height', dimensions.h);
    (function(roots){
      var parts, rootG, rootLabel, i$, len$, i, word, ref$, textWidth, textHeight, tx, ty;
      if (roots.length === 1) {
        parts = roots[0].label.split('_');
        rootG = svg.append('g').attr('class', 'root-label');
        rootLabel = rootG.append('text').attr('x', 0).attr('y', 0).attr('font-size', 0.2 * dimensions.h).attr('opacity', 0.08);
        for (i$ = 0, len$ = parts.length; i$ < len$; ++i$) {
          i = i$;
          word = parts[i$];
          rootLabel.append('tspan').text(word).attr('x', 0).attr('dx', '0.3em').attr('dy', i ? '1em' : 0);
        }
        ref$ = rootLabel.node().getBBox(), textWidth = ref$.width, textHeight = ref$.height;
        tx = dimensions.w - 1.1 * textWidth;
        ty = 60 + textHeight / 2;
        rootG.attr('transform', "translate(" + tx + "," + ty + ")");
      }
    }.call(this, filter(isRoot, graph.nodes)));
    svg.call(drawPauseBtn(dimensions, state));
    svgGroup = svg.append('g').attr('class', 'ontology').attr('transform', 'translate(5, 5)');
    force.nodes(graph.nodes).links(graph.edges).on('tick', tick).on('end', function(){
      state.set('animating', 'paused');
      return tick();
    });
    link = svgGroup.selectAll('.force-link').data(graph.edges);
    link.enter().append(state.has('spline') ? 'path' : 'line').attr('class', 'force-link').attr('stroke-width', '1px').attr('stroke', linkStroke).attr('fill', linkFill).append('title', function(e){
      return e.source.label + " " + e.label + " " + e.target.label;
    });
    link.exit().remove();
    getLabelId = compose$([
      (function(it){
        return 'label-' + it;
      }), function(it){
        return it.replace(/:/g, '-');
      }, function(it){
        return it.id;
      }
    ]);
    node = svgGroup.selectAll('.force-node').data(graph.nodes);
    nG = node.enter().append('g').attr('class', 'force-node').call(force.drag).on('click', drawPathToRoot);
    node.exit().remove();
    nG.append('circle').attr('class', 'force-term').classed('root', isRoot).classed('direct', function(it){
      return it.isDirect;
    }).attr('fill', termColor).attr('cx', -dimensions.w).attr('cy', -dimensions.h).attr('r', getR);
    nG.append('text').attr('class', 'count-label').attr('fill', 'white').attr('text-anchor', 'middle').attr('display', 'none').attr('x', -dimensions.w).attr('y', -dimensions.h).attr('dy', '0.3em');
    texts = svgGroup.selectAll('text.force-label').data(graph.nodes);
    texts.enter().append('text').attr('class', 'force-label').attr('text-anchor', 'start').attr('fill', '#555').attr('stroke', 'white').attr('stroke-width', '0.1px').attr('text-rendering', 'optimizeLegibility').attr('display', function(it){
      if (it.isDirect) {
        return 'block';
      } else {
        return 'none';
      }
    }).attr('id', getLabelId).attr('x', -dimensions.w).attr('y', -dimensions.h).text(function(it){
      return it.label;
    }).on('click', drawPathToRoot);
    nG.append('title').text(function(it){
      return it.label;
    });
    svg.call(drawRelationshipLegend(state, relationshipPalette));
    tickCount = 0;
    state.set('animating', 'running');
    force.start();
    state.on('relationship:highlight', function(rel){
      var test, colFilt;
      test = (function(){
        switch (false) {
        case !(rel && rel.label):
          return function(it){
            return it === rel;
          };
        case !rel:
          return function(it){
            return it.label === rel;
          };
        default:
          return function(){
            return false;
          };
        }
      }());
      colFilt = function(it){
        if (test(it)) {
          return brighten;
        } else {
          return id;
        }
      };
      link.attr('fill', function(d){
        return colFilt(d)(
        linkFill(d));
      });
      return link.classed('highlit', test);
    });
    state.on('nodes:marked', updateMarked);
    state.once('force:ready', centreAndZoom);
    getMinMaxSize = function(f, coll){
      return function(it){
        return function(it){
          return it.size = it.max - it.min, it;
        }(
        {
          min: minimum(it),
          max: maximum(it)
        });
      }(
      map(f, coll));
    };
    function centreAndZoom(){
      var f, ref$, x, y, dim, val, scale, translate;
      ref$ = (function(){
        var i$, ref$, len$, results$ = [];
        for (i$ = 0, len$ = (ref$ = [fn$, fn1$]).length; i$ < len$; ++i$) {
          f = ref$[i$];
          results$.push(getMinMaxSize(f, graph.nodes));
        }
        return results$;
        function fn$(it){
          return it.x;
        }
        function fn1$(it){
          return it.y;
        }
      }()), x = ref$[0], y = ref$[1];
      dim = dimensions.h < dimensions.w ? 'h' : void 8;
      ref$ = dimensions.h < dimensions.w
        ? ['h', y.size]
        : ['w', x.size], dim = ref$[0], val = ref$[1];
      console.log("Current zoom level: " + state.get('zoom'));
      console.log("y.size = " + y.size + ", height = " + dimensions.h);
      console.log("We really need a " + dim + " of at least " + val);
      scale = dimensions[dim] / (val + 300);
      console.log("Ideal fit zoom is " + scale);
      translate = (function(){
        switch (dim) {
        case 'w':
          return [5, y.min + y.size / 2];
        case 'h':
          return [(dimensions.w - x.size) / 2, 5];
        }
      }());
      if (scale < 1) {
        zoom.scale(scale);
        zoom.translate(translate);
        return state.set({
          zoom: scale,
          translate: translate
        });
      }
    }
    function isReady(){
      var ready;
      ready = state.get('animating') === 'paused' || tickCount > minTicks * ln(length(state.get('graph').edges));
      if (ready) {
        state.trigger('force:ready');
      }
      return ready;
    }
    function drawPathToRoot(d, i){
      var queue, moar, count, max, n;
      state.set('animating', 'running');
      if (isRoot(d)) {
        return toggleSubtree(d);
      } else {
        queue = [d];
        moar = function(it){
          return unique(
          reject(function(it){
            return it.marked;
          })(
          map(function(it){
            return it.target;
          })(
          it.edges)));
        };
        count = 0;
        max = state.get('maxmarked');
        while (count++ < max && (n = queue.shift())) {
          n.marked = true;
          each(bind$(queue, 'push'), moar(n));
        }
        return updateMarked();
      }
    }
    function toggleSubtree(root){
      markSubtree(root, 'muted', !root.muted);
      return updateMarked();
    }
    function unmark(){
      var i$, ref$, len$, n;
      for (i$ = 0, len$ = (ref$ = graph.nodes).length; i$ < len$; ++i$) {
        n = ref$[i$];
        n.marked = n.muted = false;
      }
      return updateMarked();
    }
    function updateMarked(){
      var currentAnimation;
      state.trigger('graph:marked');
      currentAnimation = state.get('animating');
      state.set('animating', 'running');
      force.start();
      return setTimeout(function(){
        return state.set('animating', currentAnimation);
      }, 150);
    }
    function tick(){
      var jiggle, currentFontSize, fontPlusPad, meanX, getHalf, texts, displayedTexts, circles;
      tickCount++;
      jiggle = (function(){
        switch (state.get('jiggle')) {
        case 'strata':
          return stratify;
        case 'centre':
          return centrify;
        default:
          return unfix;
        }
      }());
      if (jiggle) {
        jiggle(state);
      }
      if (!isReady()) {
        return;
      }
      if (throbber != null) {
        throbber.remove();
      }
      currentFontSize = getLabelFontSize();
      fontPlusPad = currentFontSize * 1.1;
      meanX = mean(map(function(it){
        return it.x;
      }, graph.nodes));
      getHalf = d3.scale.quantile().domain([0, dimensions.w]).range(['left', 'right']);
      texts = svgGroup.selectAll('text.force-label');
      displayedTexts = texts.filter(function(){
        return 'block' === d3.select(this).attr('display');
      });
      displayedTexts.each(function(d1, i){
        var ys, thisHalf, op;
        ys = [];
        thisHalf = getHalf(d1.x);
        displayedTexts.each(function(d2){
          if (d2 !== d2 && getHalf(d2.x === thisHalf) && abs(d1.y - d2.y) < fontPlusPad) {
            return ys.push(d2.y);
          }
        });
        if (ys.length) {
          op = d1.y > mean(ys)
            ? curry$(function(x$, y$){
              return x$ + y$;
            })
            : curry$(function(x$, y$){
              return x$ - y$;
            });
          return d1.y = op(d1.y, fontPlusPad);
        }
      });
      texts.attr('x', function(it){
        return it.x;
      }).attr('text-anchor', function(it){
        if (it.x < meanX) {
          return 'end';
        } else {
          return 'start';
        }
      }).attr('y', function(it){
        return it.y;
      }).attr('dx', function(it){
        if (it.x < meanX) {
          return 1 - getR(it);
        } else {
          return getR(it);
        }
      });
      if (state.has('spline')) {
        link.attr('d', drawCurve);
      } else {
        link.attr('x1', compose$([
          function(it){
            return it.x;
          }, function(it){
            return it.source;
          }
        ])).attr('y1', compose$([
          function(it){
            return it.y;
          }, function(it){
            return it.source;
          }
        ])).attr('x2', compose$([
          function(it){
            return it.x;
          }, function(it){
            return it.target;
          }
        ])).attr('y2', compose$([
          function(it){
            return it.y;
          }, function(it){
            return it.target;
          }
        ]));
      }
      svgGroup.selectAll('text').attr('display', function(arg$){
        var marked, id, edges, isDirect;
        marked = arg$.marked, id = arg$.id, edges = arg$.edges, isDirect = arg$.isDirect;
        switch (false) {
        case !(graph.nodes.length < state.get('smallGraphThreshold')):
          return 'block';
        case !(state.get('zoom') > 1.2):
          return 'block';
        case !(marked || isDirect):
          return 'block';
        default:
          return 'none';
        }
      });
      node.selectAll('text.count-label').text(function(it){
        return it.count;
      }).attr('x', function(it){
        return it.x;
      }).attr('y', function(it){
        return it.y;
      }).attr('font-size', compose$([
        (function(it){
          return it / 1.5;
        }), getR
      ])).attr('display', function(arg$){
        var marked, isRoot, isDirect;
        marked = arg$.marked, isRoot = arg$.isRoot, isDirect = arg$.isDirect;
        switch (false) {
        case !(marked || isDirect || isRoot):
          return 'block';
        default:
          return 'none';
        }
      });
      svgGroup.selectAll('text.force-label').attr('font-size', currentFontSize);
      link.attr('stroke-width', function(arg$){
        var target;
        target = arg$.target;
        switch (false) {
        case !target.marked:
          return '2px';
        default:
          return '1px';
        }
      });
      circles = node.selectAll('circle').attr('r', getR).attr('cx', function(it){
        return it.x;
      }).attr('cy', function(it){
        return it.y;
      });
      if (any(function(it){
        return it.marked;
      }, graph.nodes)) {
        circles.attr('opacity', function(it){
          if (it.marked || it.isRoot) {
            return 1;
          } else {
            return 0.2;
          }
        });
        link.attr('opacity', function(arg$){
          var source, target;
          source = arg$.source, target = arg$.target;
          switch (false) {
          case !(source.marked && (target.marked || target.isRoot)):
            return 0.8;
          default:
            return 0.1;
          }
        });
        return svgGroup.selectAll('text').attr('opacity', function(it){
          if (it.marked) {
            return 1;
          } else {
            return 0.2;
          }
        });
      } else {
        link.attr('opacity', function(arg$){
          var muted;
          muted = arg$.source.muted;
          if (muted) {
            return 0.3;
          } else {
            return 0.5;
          }
        });
        circles.attr('opacity', function(arg$){
          var muted, isDirect;
          muted = arg$.muted, isDirect = arg$.isDirect;
          switch (false) {
          case !muted:
            return 0.3;
          case !isDirect:
            return 1;
          default:
            return 0.9;
          }
        });
        return svgGroup.selectAll('text').attr('opacity', function(it){
          if (it.muted) {
            return 0.3;
          } else {
            return 1;
          }
        });
      }
    }
    return tick;
  };
  drawDag = function(directNodes, edges, nodeForIdent){
    var graph, svg, svgGroup;
    graph = makeGraph.apply(this, arguments);
    svg = d3.select('svg');
    svgGroup = svg.append('g').attr('transform', 'translate(5, 5)');
    d3.selectAll(svg.node).attr('width', $('body').width()).attr('height', $('body').height());
    return renderDag(svg, svgGroup, graph);
  };
  makeGraph = function(directNodes, edges, nodeForIdent){
    var i$, len$, e, j$, ref$, len1$, prop, node, nodes, isRoot, isLeaf, n;
    for (i$ = 0, len$ = edges.length; i$ < len$; ++i$) {
      e = edges[i$];
      for (j$ = 0, len1$ = (ref$ = ['source', 'target']).length; j$ < len1$; ++j$) {
        prop = ref$[j$];
        node = nodeForIdent[e[prop]];
        if (node == null) {
          throw new Error("Could not find node: " + e[prop] + ", the " + prop + " of " + (prop === 'source'
            ? e.target
            : e.source));
        }
        node.edges.push(e);
      }
    }
    for (i$ = 0, len$ = edges.length; i$ < len$; ++i$) {
      e = edges[i$];
      e.source = nodeForIdent[e.source];
      e.target = nodeForIdent[e.target];
    }
    nodes = values(nodeForIdent);
    isRoot = function(n){
      return all((function(it){
        return it === n;
      }), map(function(it){
        return it.target;
      }, n.edges));
    };
    isLeaf = function(n){
      return all((function(it){
        return it === n;
      }), map(function(it){
        return it.source;
      }, n.edges));
    };
    for (i$ = 0, len$ = nodes.length; i$ < len$; ++i$) {
      n = nodes[i$];
      n.isDirect = in$(n.id, directNodes);
      n.isLeaf = isLeaf(n);
      n.isRoot = isRoot(n);
      n.marked = n.muted = false;
      if (n.isRoot) {
        markSubtree(n, 'root', n);
      }
    }
    return {
      nodes: nodes,
      edges: edges
    };
  };
  doUpdate = function(group){
    var labelG;
    group.selectAll('circle.cp').attr('r', 10).attr('cx', function(it){
      return it.x;
    }).attr('cy', function(it){
      return it.y;
    });
    labelG = group.selectAll('g.label');
    return labelG.attr('dx', function(arg$){
      var points;
      points = arg$.dagre.points;
      return mean(map(function(it){
        return it.x;
      }, points));
    }).attr('dy', function(arg$){
      var points;
      points = arg$.dagre.points;
      return mean(map(function(it){
        return it.y;
      }, points));
    }).attr('width', function(it){
      return it.width;
    }).attr('height', function(it){
      return it.height;
    }).attr('transform', function(arg$){
      var points, bbox, x, y;
      points = arg$.dagre.points, bbox = arg$.bbox;
      x = mean(map(function(it){
        return it.x;
      }, points));
      y = mean(map(function(it){
        return it.y;
      }, points));
      return "translate(" + x + "," + y + ")";
    });
  };
  renderDag = curry$(function(svg, svgGroup, arg$){
    var nodes, edges, reset, reRender, update, svgBBox, currentZoom, mvEdge, svgEdges, edgesEnter, svgNodes, nodesEnter, x$, rects, dragCp, lineWrap, labels, applyLayout, maxY, zoom, asZoom, maxX, dx, deDup, toCombos, getOverlapping, getDescale, separateColliding, drawCollisions, explodify, fixDagBoxCollisions, focusEdges, highlightTargets, relationships, palette, edgeStroke, getDragX, getDragY, dragHandler, nodeDrag, edgeDrag;
    nodes = arg$.nodes, edges = arg$.edges, reset = arg$.reset;
    reRender = renderDag(svg, svgGroup);
    update = function(){
      return doUpdate(svgGroup);
    };
    reset == null && (reset = function(){
      return reRender({
        nodes: nodes,
        edges: edges
      });
    });
    console.log("Rendering " + length(nodes) + " nodes and " + length(edges) + " edges");
    svgBBox = svg.node().getBBox();
    currentZoom = 1;
    mvEdge = translateEdge(svg);
    svgGroup.selectAll('*').remove();
    svgEdges = svgGroup.selectAll('g .edge').data(edges);
    edgesEnter = svgEdges.enter().append('g').attr('id', function(it){
      return (it.source.id + it.label + it.target.id).replace(/:/g, '_');
    }).attr('class', 'edge');
    svgEdges.exit().remove();
    svgNodes = svgGroup.selectAll('g .node').data(nodes);
    nodesEnter = svgNodes.enter().append('g').attr('class', 'node').attr('id', toNodeId);
    x$ = svgNodes;
    x$.exit().remove();
    nodesEnter.on('click', function(node){
      var wasFiltered, filtered;
      wasFiltered = node.isFocus;
      unmark(nodes);
      if (wasFiltered) {
        console.log("Resetting");
        return reset();
      } else {
        markReachable(node);
        filtered = onlyMarked(nodes, edges);
        return reRender((filtered.reset = reset, filtered));
      }
    });
    edgesEnter.append('path').attr('marker-end', 'url(#Triangle)').attr('stroke-width', 5).attr('opacity', 0.8).attr('stroke', linkStroke);
    rects = nodesEnter.append('rect');
    dragCp = d3.behavior.drag().on('drag', function(d){
      d.y += d3.event.dy;
      mvEdge(d.parent, d3.event.dx, 0);
      return d3.select('#' + d.parent.dagre.id).attr('d', spline);
    });
    lineWrap = function(str){
      var buff, maxLl, i$, ref$, len$, word;
      buff = [''];
      maxLl = 25;
      for (i$ = 0, len$ = (ref$ = str.split(' ')).length; i$ < len$; ++i$) {
        word = ref$[i$];
        if (buff[buff.length - 1].length + word.length + 1 > maxLl) {
          buff.push('');
        }
        buff[buff.length - 1] += ' ' + word;
      }
      return map(function(it){
        return it.substring(1);
      }, buff);
    };
    labels = nodesEnter.append('text').attr('class', 'dag-label').attr('text-anchor', 'middle').attr('x', 0).classed('direct', function(it){
      return it.isDirect;
    });
    labels.each(function(n){
      var text, el, i$, len$, line, bbox;
      text = lineWrap(n.label);
      el = d3.select(this);
      for (i$ = 0, len$ = text.length; i$ < len$; ++i$) {
        line = text[i$];
        el.append('tspan').text(line).attr('dy', '1em').attr('x', 0);
      }
      bbox = this.getBBox();
      n.bbox = bbox;
      n.width = bbox.width + 2 * nodePadding;
      return n.height = bbox.height + 2 * nodePadding;
    });
    rects.attr('width', function(it){
      return it.width;
    }).attr('height', function(it){
      return it.height;
    }).attr('x', compose$([
      (function(it){
        return 1 - it;
      }), (function(it){
        return it / 2;
      }), function(it){
        return it.width;
      }
    ])).attr('y', compose$([
      (function(it){
        return 1 - it;
      }), (function(it){
        return it / 2;
      }), function(it){
        return it.height;
      }
    ])).attr('fill', termColor).classed('focus', function(it){
      return it.isFocus;
    }).classed('direct', function(it){
      return it.isDirect;
    }).classed('root', function(it){
      return it.isRoot;
    });
    labels.attr('x', function(it){
      return -it.bbox.width;
    }).attr('y', function(it){
      return -it.bbox.height / 2;
    });
    dagre.layout().nodeSep(50).edgeSep(20).rankSep(75).rankDir('LR').nodes(nodes).edges(edges).debugLevel(1).run();
    (applyLayout = function(){
      return nodesEnter.attr('transform', function(it){
        return "translate(" + it.dagre.x + "," + it.dagre.y + ")";
      });
    })();
    maxY = fold(max, 0, map(function(it){
      return it.dagre.y;
    }, nodes));
    zoom = d3.behavior.zoom().on('zoom', function(){
      currentZoom = d3.event.scale;
      return svgGroup.attr('transform', "translate(" + d3.event.translate + ") scale(" + currentZoom + ")");
    });
    asZoom = ($('body').height() - 100) / maxY;
    console.log(maxY);
    if (asZoom < 1) {
      currentZoom = asZoom;
      zoom.scale(currentZoom);
      svgGroup.attr('transform', "translate(5,5) scale(" + currentZoom + ")");
    }
    maxX = 200 + currentZoom * fold(max, 0, map(function(it){
      return it.dagre.x;
    }, nodes));
    if (maxX < $('body').width()) {
      dx = ($('body').width() - maxX) / 2;
      zoom.translate([dx, 5]);
      svgGroup.attr('transform', "translate(" + dx + ",5) scale(" + currentZoom + ")");
    }
    deDup = function(f){
      return fold(function(ls, e){
        if (any((function(it){
          return it === f(e);
        }), map(f, ls))) {
          return ls.slice();
        } else {
          return ls.concat([e]);
        }
      }, []);
    };
    toCombos = deDup(compose$([
      join('-'), sort, map(function(it){
        return it.id;
      })
    ]));
    getOverlapping = function(things){
      var t, tt;
      return toCombos((function(){
        var i$, ref$, len$, j$, ref1$, len1$, results$ = [];
        for (i$ = 0, len$ = (ref$ = things).length; i$ < len$; ++i$) {
          t = ref$[i$];
          for (j$ = 0, len1$ = (ref1$ = things).length; j$ < len1$; ++j$) {
            tt = ref1$[j$];
            if (t !== tt && overlaps(t, tt)) {
              results$.push([t, tt]);
            }
          }
        }
        return results$;
      }()));
    };
    getDescale = function(){
      return 1 / currentZoom;
    };
    separateColliding = function(left, right){
      var ref$, ptA, ptB, speed;
      ref$ = map(compose$([
        toXywh, function(it){
          return it.bounds;
        }
      ]), [left, right]), ptA = ref$[0], ptB = ref$[1];
      speed = 0.1;
      if (!right.isCentre) {
        mvTowards(-speed, ptA, ptB);
      }
      if (!left.isCentre) {
        mvTowards(-speed, ptB, ptA);
      }
      import$(left.bounds, toLtrb(ptA));
      return import$(right.bounds, toLtrb(ptB));
    };
    drawCollisions = function(collisions){
      var i$, len$, collision, lresult$, j$, len1$, node, results$ = [];
      for (i$ = 0, len$ = collisions.length; i$ < len$; ++i$) {
        collision = collisions[i$];
        lresult$ = [];
        for (j$ = 0, len1$ = collision.length; j$ < len1$; ++j$) {
          node = collision[j$];
          lresult$.push(drawDebugRect(svgGroup, node));
        }
        results$.push(lresult$);
      }
      return results$;
    };
    explodify = function(highlit, i, roundsPerRun, maxRounds, done){
      var collisions, nextBreak, i$, len$, ref$, left, right;
      collisions = getOverlapping(highlit);
      nextBreak = i + roundsPerRun;
      while (collisions.length && i++ < maxRounds && i < nextBreak) {
        for (i$ = 0, len$ = collisions.length; i$ < len$; ++i$) {
          ref$ = collisions[i$], left = ref$[0], right = ref$[1];
          separateColliding(left, right);
        }
        collisions = getOverlapping(highlit);
      }
      if (collisions.length && i < maxRounds) {
        done();
        return setTimeout(function(){
          return explodify(highlit, i, roundsPerRun, maxRounds, done);
        }, 0);
      } else {
        console.log(collisions.length + " collisions left after " + i + " rounds");
        return done();
      }
    };
    fixDagBoxCollisions = curry$(function(maxI, d, i){
      var scale, halfPad, isFocussed, highlit, maxRounds, round, roundsPerRun;
      if (i < maxI) {
        return;
      }
      scale = getDescale();
      halfPad = nodePadding / 2;
      isFocussed = function(it){
        return any(function(it){
          return it.highlight;
        }, it.edges);
      };
      highlit = map(function(it){
        var ref$;
        return it.bounds = toLtrb({
          x: (ref$ = it.dagre).x,
          y: ref$.y,
          height: ref$.height,
          width: ref$.width
        }, scale), it;
      }, filter(isFocussed, nodes));
      if (!highlit.length) {
        return;
      }
      maxRounds = 50;
      round = 0;
      roundsPerRun = 5;
      return explodify(highlit, round, roundsPerRun, maxRounds, function(){
        return nodesEnter.each(function(n, i){
          var fill, nodeSelection, ref$, x, y;
          fill = (n.isCentre ? brighten : id)(
          termColor(
          n));
          nodeSelection = d3.select(this);
          if (isFocussed(n)) {
            ref$ = toXywh(n.bounds), x = ref$.x, y = ref$.y;
            nodeSelection.transition().duration(100).attr('transform', "translate(" + x + "," + y + ") scale(" + scale + ")");
          }
          return nodeSelection.selectAll('rect').attr('fill', fill);
        });
      });
    });
    focusEdges = function(){
      var someLit, duration, delay, deScale, maxI, notFocussed;
      someLit = any(function(it){
        return it.highlight;
      }, edges);
      duration = 100;
      delay = 200;
      deScale = Math.max(1, getDescale());
      maxI = nodes.length - 1;
      notFocussed = function(it){
        return !someLit || !any(function(it){
          return it.highlight;
        }, it.edges);
      };
      nodesEnter.transition().duration(duration * 2).delay(delay).attr('transform', function(it){
        switch (false) {
        case !notFocussed(it):
          return "translate(" + it.dagre.x + "," + it.dagre.y + ")";
        default:
          return "translate(" + it.dagre.x + "," + it.dagre.y + ") scale(" + deScale + ")";
        }
      }).attr('opacity', function(it){
        switch (false) {
        case !!someLit:
          return 1;
        case !any(function(it){
            return it.highlight;
          }, it.edges):
          return 1;
        default:
          return 0.3;
        }
      }).each('end', someLit && deScale > 1
        ? fixDagBoxCollisions(maxI)
        : function(){});
      svgEdges.selectAll('path').transition().delay(delay).duration(duration).attr('stroke-width', function(it){
        if (it.highlight) {
          return 15;
        } else {
          return 5;
        }
      }).attr('stroke', function(it){
        switch (false) {
        case !it.highlight:
          return BRIGHTEN(linkStroke(it));
        default:
          return linkStroke(it);
        }
      }).attr('fill', function(it){
        switch (false) {
        case !it.highlight:
          return BRIGHTEN(linkFill(it));
        default:
          return linkFill(it);
        }
      }).attr('opacity', function(it){
        switch (false) {
        case !(!someLit || it.highlight):
          return 0.8;
        case !someLit:
          return 0.2;
        default:
          return 0.5;
        }
      });
      return svgEdges.selectAll('text').transition().duration(duration).delay(delay).attr('font-weight', function(it){
        if (it.highlight) {
          return 'bold';
        } else {
          return 'normal';
        }
      }).attr('font-size', function(it){
        if (it.highlight) {
          return 28;
        } else {
          return 14;
        }
      });
    };
    highlightTargets = function(node){
      var moar, queue, maxMarked, marked, n;
      svgGroup.node().appendChild(this);
      moar = function(n){
        return reject((function(it){
          return it === n;
        }), map(function(it){
          return it.target;
        }, n.edges));
      };
      node.isCentre = true;
      queue = [node];
      maxMarked = 25;
      marked = 0;
      while ((n = queue.shift()) && marked++ < maxMarked) {
        each((fn$), reject(compose$([(fn1$), fn2$]), n.edges));
        each(bind$(queue, 'push'), moar(n));
      }
      return focusEdges();
      function fn$(it){
        return it.highlight = true, it;
      }
      function fn1$(it){
        return it === n;
      }
      function fn2$(it){
        return it.target;
      }
    };
    nodesEnter.on('mouseover', highlightTargets);
    nodesEnter.on('mouseout', function(node){
      var i$, ref$, len$, e;
      for (i$ = 0, len$ = (ref$ = edges).length; i$ < len$; ++i$) {
        e = ref$[i$];
        e.source.isCentre = e.target.isCentre = false;
        e.highlight = false;
      }
      return focusEdges();
    });
    edgesEnter.each(function(d){
      var points, s, t;
      points = d.dagre.points;
      if (!points.length) {
        s = d.source.dagre;
        t = d.target.dagre;
        points.push({
          x: (s.x + t.x) / 2,
          y: (s.y + t.y) / 2
        });
      }
      if (points.length === 1) {
        return points.push({
          x: points[0].x,
          y: points[0].y
        });
      }
    });
    addLabels(edgesEnter);
    edgesEnter.selectAll('circle.cp').data(function(d){
      var i$, ref$, len$, p;
      for (i$ = 0, len$ = (ref$ = d.dagre.points).length; i$ < len$; ++i$) {
        p = ref$[i$];
        p.parent = d;
      }
      return d.dagre.points.slice().reverse();
    }).enter().append('circle').attr('class', 'cp').call(dragCp);
    relationships = reverse(unique(map(function(it){
      return it.label;
    }, edges)));
    palette = d3.scale.category10();
    edgeStroke = compose$([
      palette, bind$(relationships, 'indexOf'), function(it){
        return it.label;
      }
    ]);
    svgEdges.selectAll('path').attr('id', compose$([
      function(it){
        return it.id;
      }, function(it){
        return it.dagre;
      }
    ])).attr('d', spline).attr('stroke', edgeStroke);
    update();
    getDragX = getNodeDragPos('x');
    getDragY = getNodeDragPos('y');
    dragHandler = function(d, i){
      var prevX, prevY, dx, dy, i$, ref$, len$, e, results$ = [];
      prevX = d.dagre.x;
      prevY = d.dagre.y;
      d.dagre.x = getDragX();
      d.dagre.y = getDragY();
      d3.select(this).attr('transform', "translate(" + d.dagre.x + "," + d.dagre.y + ")");
      dx = d.dagre.x - prevX;
      dy = d.dagre.y - prevY;
      for (i$ = 0, len$ = (ref$ = d.edges).length; i$ < len$; ++i$) {
        e = ref$[i$];
        mvEdge(e, dx, dy);
        update();
        results$.push(d3.select('#' + e.dagre.id).attr('d', spline(e)));
      }
      return results$;
    };
    nodeDrag = d3.behavior.drag().origin(function(arg$){
      var pos, dagre;
      pos = arg$.pos, dagre = arg$.dagre;
      return function(arg$){
        var x, y;
        x = arg$.x, y = arg$.y;
        return {
          x: x,
          y: y
        };
      }(
      pos ? pos : dagre);
    }).on('drag', dragHandler);
    edgeDrag = d3.behavior.drag().on('drag', function(d, i){
      mvEdge(d, d3.event.dx, d3.event.dy);
      return d3.select(this).attr('d', spline(d));
    });
    svg.call(zoom);
    nodesEnter.call(nodeDrag);
    return edgesEnter.call(edgeDrag);
  });
  rowToNode = function(arg$){
    var source, label, target;
    source = arg$[0], label = arg$[1], target = arg$[2];
    return {
      target: target,
      label: label,
      source: source
    };
  };
  queryParams = listToObj(
  map(compose$([
    map(decodeURIComponent), function(it){
      return it.split('=');
    }
  ]))(
  function(it){
    return it.split('&');
  }(
  function(it){
    return it.substring(1);
  }(
  location.search || '?'))));
  currentSymbol = function(){
    return queryParams.symbol || 'bsk';
  };
  main = function(symbol){
    var fetchFlat, gettingDirect, gettingAll, gettingNames, gettingEdges, draw;
    console.log("Drawing graph for " + symbol);
    fetchFlat = flatRows(rows);
    gettingDirect = fetchFlat(
    directTerms(
    symbol));
    gettingAll = fetchFlat(
    allGoTerms(
    symbol));
    gettingNames = gettingAll.then(fetchNames(rows));
    gettingEdges = gettingAll.then(compose$([rows, wholeGraphQ])).then(map(rowToNode));
    draw = (function(){
      switch (queryParams.view) {
      case 'force':
        return drawForce;
      default:
        return drawDag;
      }
    }());
    return $.when(gettingDirect, gettingEdges, gettingNames, symbol).then(draw);
  };
  main(currentSymbol());
  function toLtrb(arg$, k){
    var x, y, height, width;
    x = arg$.x, y = arg$.y, height = arg$.height, width = arg$.width;
    k == null && (k = 1);
    return {
      l: x - k * width / 2,
      t: y - k * height / 2,
      r: x + k * width / 2,
      b: y + k * height / 2
    };
  }
  function toXywh(arg$){
    var l, t, r, b;
    l = arg$.l, t = arg$.t, r = arg$.r, b = arg$.b;
    return {
      x: l + (r - l) / 2,
      y: t + (b - t) / 2,
      height: b - t,
      width: r - l
    };
  }
  debugColors = d3.scale.category10();
  function drawDebugRect(svgGroup, node){
    console.log('drawing', node.id);
    return (function(tracked){
      svgGroup.append('circle').attr('cx', tracked.x).attr('fill', 'green').attr('cy', tracked.y).attr('r', 10);
      return svgGroup.append('rect').attr('x', tracked.x - tracked.width / 2).attr('y', tracked.y - tracked.height / 2).attr('width', tracked.width).attr('height', tracked.height).attr('stroke', 'red').attr('stroke-width', 1).attr('opacity', 0.3).attr('fill', debugColors(node.id));
    }.call(this, toXywh(node.bounds)));
  }
  sortOnX = sortBy(compare(function(it){
    return it.l;
  }));
  sortOnY = sortBy(compare(function(it){
    return it.t;
  }));
  function overlaps(arg$, arg1$){
    var a, b, p, ref$, overlapsH, overlapsV, contained;
    a = arg$.bounds;
    b = arg1$.bounds;
    p = nodePadding;
    ref$ = sortOnX([a, b]), a = ref$[0], b = ref$[1];
    overlapsH = (function(){
      switch (false) {
      case !(a.l - p < b.l && b.l - p < a.r):
        return true;
      case !(a.l - p < b.r && b.r + p < a.r):
        return true;
      default:
        return false;
      }
    }());
    ref$ = sortOnY([a, b]), a = ref$[0], b = ref$[1];
    overlapsV = (function(){
      switch (false) {
      case !(a.t - p < b.t && b.t - p < a.b):
        return true;
      case !(a.t - p < b.b && b.b + p < a.b):
        return true;
      default:
        return false;
      }
    }());
    contained = (function(){
      switch (false) {
      case !(overlapsH || overlapsV):
        return false;
      case !(a.l < b.l && b.l < a.r && a.t < b.t && b.t < a.b):
        return true;
      default:
        return false;
      }
    }());
    return contained || (overlapsH && overlapsV);
  }
  function compose$(fs){
    return function(){
      var i, args = arguments;
      for (i = fs.length; i > 0; --i) { args = [fs[i-1].apply(this, args)]; }
      return args[0];
    };
  }
  function curry$(f, bound){
    var context,
    _curry = function(args) {
      return f.length > 1 ? function(){
        var params = args ? args.concat() : [];
        context = bound ? context || this : this;
        return params.push.apply(params, arguments) <
            f.length && arguments.length ?
          _curry.call(context, params) : f.apply(context, params);
      } : f;
    };
    return _curry();
  }
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
  function not$(x){ return !x; }
  function in$(x, arr){
    var i = -1, l = arr.length >>> 0;
    while (++i < l) if (x === arr[i] && i in arr) return true;
    return false;
  }
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
