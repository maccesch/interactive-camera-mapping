  var Grid;
(function() {
  Grid = (function() {
    function Grid(waterLevel) {
      this.waterLevel = waterLevel != null ? waterLevel : 0.0;
      this.triangles = [];
      this.maxHeight = 0.0;
      this.intervalX = [0.0, 0.0];
      this.intervalZ = [0.0, 0.0];
    }
    Grid.prototype.addTriangle = function(face3) {
      var point, _i, _len, _ref;
      if (face3.a.y < this.waterLevel && face3.b.y < this.waterLevel && face3.c.y < this.waterLevel || face3.normal.y > 0.9) {
        return;
      }
      this.triangles.push(face3);
      _ref = [face3.a, face3.b, face3.c];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        point = _ref[_i];
        if (this.maxHeight < point.y) {
          this.maxHeight = point.y;
        }
        if (this.intervalX[0] > point.x) {
          this.intervalX[0] = point.x;
        }
        if (this.intervalX[1] < point.x) {
          this.intervalX[1] = point.x;
        }
        if (this.intervalZ[0] > point.z) {
          this.intervalZ[0] = point.z;
        }
        if (this.intervalZ[1] < point.z) {
          this.intervalZ[1] = point.z;
        }
      }
      return this.preCalcAcc(face3);
    };
    Grid.prototype.preCalcAcc = function(face3) {
      var N, b, c, div;
      b = (new THREE.Vector3).sub(face3.c, face3.a);
      c = (new THREE.Vector3).sub(face3.b, face3.a);
      N = (new THREE.Vector3).cross(c, b);
      face3.n_u = N.x / N.z;
      face3.n_v = N.y / N.z;
      face3.n_d = N.dot(face3.a) / N.z;
      div = b.x * c.y - b.y * c.x;
      face3.b_nu = -b.y / div;
      face3.b_nv = b.x / div;
      face3.b_d = (b.y * face3.a.x - b.x * face3.a.y) / div;
      face3.c_nu = -c.y / div;
      face3.c_nv = c.x / div;
      return face3.c_d = (c.y * face3.a.x - c.x * face3.a.y) / div;
    };
    Grid.prototype.build = function() {
      var i, row, triangle, _i, _len, _ref, _ref2, _ref3, _results;
      this.size = Math.floor(Math.sqrt(this.triangles.length));
      this.cellSizeX = (this.intervalX[1] - this.intervalX[0]) / this.size;
      this.cellSizeZ = (this.intervalZ[1] - this.intervalZ[0]) / this.size;
      for (i = 1, _ref = this.size + 1; 1 <= _ref ? i <= _ref : i >= _ref; 1 <= _ref ? i++ : i--) {
        row = [];
      }
      for (i = 1, _ref2 = this.size + 1; 1 <= _ref2 ? i <= _ref2 : i >= _ref2; 1 <= _ref2 ? i++ : i--) {
        this.cells = row;
      }
      _ref3 = this.triangles;
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        triangle = _ref3[_i];
        _results.push(this.addTriangleToGrid(triangle));
      }
      return _results;
    };
    Grid.prototype.addTriangleToGrid = function(face3) {
      var add, cell, cells, point, x, z, _i, _j, _k, _len, _len2, _len3, _ref, _results;
      cells = [];
      _ref = [face3.a, face3.b, face3.c];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        point = _ref[_i];
        x = Math.floor(point.x / this.cellSizeX);
        z = Math.floor(point.z / this.cellSizeZ);
        add = True;
        for (_j = 0, _len2 = cells.length; _j < _len2; _j++) {
          cell = cells[_j];
          if (cell[0] === x && cell[1] === z) {
            add = False;
            break;
          }
        }
        if (add) {
          cells.push([x, z]);
        }
      }
      _results = [];
      for (_k = 0, _len3 = cells.length; _k < _len3; _k++) {
        cell = cells[_k];
        _results.push(this.cells[cell[0]][cell[1]].push(face3));
      }
      return _results;
    };
    Grid.prototype.triangleToShader = function(face3, index) {
      return "\n// triangle " + index + "\naccs[" + index + "].n_u = " + face3.n_u + ";\naccs[" + index + "].n_v = " + face3.n_v + ";\naccs[" + index + "].n_d = " + face3.n_d + ";\n\naccs[" + index + "].b_nu = " + face3.b_nu + ";\naccs[" + index + "].b_nv = " + face3.b_nv + ";\naccs[" + index + "].b_d = " + face3.b_d + ";\n\naccs[" + index + "].c_nu = " + face3.c_nu + ";\naccs[" + index + "].c_nv = " + face3.c_nv + ";\naccs[" + index + "].c_d = " + face3.c_d + ";";
    };
    Grid.prototype.trianglesToShader = function() {
      var face3, index, _len, _ref, _results;
      _ref = this.triangles;
      _results = [];
      for (index = 0, _len = _ref.length; index < _len; index++) {
        face3 = _ref[index];
        _results.push(this.triangleToShader(face3, index));
      }
      return _results;
    };
    Grid.prototype.fragmentShader = function() {
      return "// Fast ray triangle intersection algorithm after PhD from Ingo Wald\n\nstruct TriAccel\n{\n	// plane:\n	float n_u; //!< == normal.u / normal.k\n	float n_v; //!< == normal.v / normal.k\n	float n_d; //!< constant of plane equation\n	\n	// line equation for line ac\n	float b_nu;\n	float b_nv;\n	float b_d;\n	\n	// line equation for line ab\n	float c_nu;\n	float c_nv;\n	float c_d;\n};\n\nconst int TRIANGLE_NUM = " + this.triangles.length + ";\n\nTriAccel accs[TRIANGLE_NUM];\n" + (this.trianglesToShader()) + "\n\nconst float MIN_DIST = 0.01;\nconst float MAX_DIST = 100.0;\n\nbool intersect(in TriAccel acc, in vec3 rayOrg, in vec3 rayDir, out float lambda, out float mue) {\n	// we always project onto XY Plane\n	const float nd = 1.0 / (rayDir.z + acc.n_u * rayDir.x + acc.n_v * rayDir.y);\n	const float f = (acc.n_d - rayOrg.z - acc.n_u * rayOrg.x - acc.n_v * rayOrg.y) * nd;\n	\n	// check for valid distance\n	if (!(MAX_DIST > f && f > MIN_DIST)) {\n		return false;\n	}\n	\n	// compute hitpoint positions on uv plane\n	const float hu = rayOrg.x + f * rayDir.x;\n	const float hv = rayOrg.y + f * rayDir.y;\n	\n	// check first barycentric coordinate\n	lambda = hu * acc.b_nu + hv * acc.b_nv + acc.b_d;\n	if (lambda < 0.0) {\n		return false;\n	}\n	\n	// check second barycentric coordinate\n	mue = hu * acc.c_nu + hv * acc.c_nv + acc.c_d;\n	if (mue < 0.0) {\n		return false;\n	}\n\n	// check third barycentric coordinate\n	if (lambda + mue > 1.0) {\n		return false;\n	}\n	\n	// we have a valid hitpoint here. return values.\n	return true;\n}\n\n// returns the color of the fragment\nvec4 traceRay(vec3 rayOrg, vec3 rayDir) {\n	float beta, gamma;\n	\n	for (int i = 0; i < TRIANGLE_NUM; ++i) {\n		\n		if (intersect(accs[i], rayOrg, rayDir, beta, gamma)) {\n			return vec4(1.0, 0.0, 0.0, 1.0);\n		}\n	}\n	\n	return vec4(0.3, 0.3, 0.3, 1.0);\n}";
    };
    return Grid;
  })();
}).call(this);
